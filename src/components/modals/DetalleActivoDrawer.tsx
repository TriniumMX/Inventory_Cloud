import { useState, useEffect, useRef } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listConsignas, listClasificaciones } from "@/lib/api";
import { getEmployeeByNomina } from "@/lib/employees";
import { mapSqlToClasificacion } from "@/lib/mappers";
import { 
  Package, 
  Cpu, 
  Receipt, 
  Tags, 
  UserCircle, 
  Activity, 
  FileText, 
  X, 
  History, 
  Printer,
  Building2,
  User 
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Activo } from "@/lib/types";

interface DetalleActivoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activo: Activo | null;
  onVerHistorico?: () => void;
}

interface ResguardanteInfo {
  tipo: "Empleado" | "Institucion" | "Sin asignar";
  nombre: string;
  nomina?: string;
  departamento?: string;
  puesto?: string;
}

// Componente para cada sección
function Section({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) {
  return (
    <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border">
      <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
        {title}
      </h3>
      {children}
    </div>
  );
}

// Componente para cada campo
function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

export function DetalleActivoDrawer({
  open,
  onOpenChange,
  activo,
  onVerHistorico,
}: DetalleActivoDrawerProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  // Estado para resguardante actual
  const [resguardante, setResguardante] = useState<ResguardanteInfo | null>(null);
  const [loadingResguardante, setLoadingResguardante] = useState(false);
  
  // Estado para código de clasificación (cuando no viene del backend)
  const [clasificacionCodigo, setClasificacionCodigo] = useState<string | null>(null);

  // Cargar datos del resguardante actual
  const loadResguardante = async () => {
    if (!activo?.ultimoNomina) {
      setResguardante({ tipo: "Sin asignar", nombre: "Sin resguardante asignado" });
      return;
    }

    setLoadingResguardante(true);
    try {
      // Primero intentar buscar como empleado
      const empleado = await getEmployeeByNomina(activo.ultimoNomina);
      if (empleado) {
        setResguardante({
          tipo: "Empleado",
          nombre: empleado.nombre,
          nomina: activo.ultimoNomina,
          departamento: empleado.departamento,
          puesto: empleado.puesto,
        });
        return;
      }

      // Si no es empleado, buscar en instituciones
      const consignasResponse = await listConsignas();
      const institucion = consignasResponse.data.items.find(
        (c: { nombre: string }) => c.nombre.toLowerCase() === activo.ultimoNomina!.toLowerCase()
      );

      if (institucion) {
        setResguardante({
          tipo: "Institucion",
          nombre: institucion.nombre,
        });
      } else {
        // Mostrar el valor como está (podría ser nómina sin registro en web service)
        setResguardante({
          tipo: "Empleado",
          nombre: activo.ultimoNomina,
          nomina: activo.ultimoNomina,
        });
      }
    } catch (error) {
      console.error("Error cargando resguardante:", error);
      setResguardante({
        tipo: "Empleado",
        nombre: activo?.ultimoNomina || "Desconocido",
        nomina: activo?.ultimoNomina,
      });
    } finally {
      setLoadingResguardante(false);
    }
  };

  // Cargar nombre de clasificación desde catálogo si no viene en los datos
  const loadClasificacionCodigo = async () => {
    if (!activo?.clasificacion || activo.clasificacionNombre || activo.clasificacionCodigo) {
      setClasificacionCodigo(activo?.clasificacionNombre || activo?.clasificacionCodigo || null);
      return;
    }
    
    try {
      const response = await listClasificaciones();
      const clasificaciones = response.data.items.map(mapSqlToClasificacion);
      const found = clasificaciones.find(c => c.id === activo.clasificacion);
      if (found) {
        // El campo "nombre" contiene la clasificación (ej: "ACUMULADOR", "SILLA")
        setClasificacionCodigo(found.nombre);
      }
    } catch (error) {
      console.error("Error cargando clasificación:", error);
    }
  };

  useEffect(() => {
    if (open && activo) {
      loadResguardante();
      loadClasificacionCodigo();
      
      // Focus en el título al abrir
      setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
    }
  }, [open, activo?.ultimoNomina, activo?.clasificacion]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  const handlePrintLabel = () => {
    if (activo) {
      // Pass description and serial number as query params for the label
      const params = new URLSearchParams();
      if (activo.descripcion) params.set("desc", activo.descripcion);
      if (activo.numeroSerie) params.set("ns", activo.numeroSerie);
      
      const queryString = params.toString();
      const url = `/etiquetas/${activo.numeroInventario}${queryString ? `?${queryString}` : ""}`;
      window.open(url, "_blank");
    }
  };

  const handleVerHistorico = () => {
    onOpenChange(false);
    if (onVerHistorico) {
      setTimeout(() => {
        onVerHistorico();
      }, 150);
    }
  };

  // Formatear fecha
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  // Formatear moneda
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "—";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Obtener variante del badge de estatus
  const getEstatusVariant = (estatus?: string) => {
    switch (estatus) {
      case "ACTIVO":
        return "bg-secondary/10 text-secondary hover:bg-secondary/20";
      case "ALMACEN":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "BAJA":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "";
    }
  };

  if (!activo) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="max-h-[92vh]"
        onKeyDown={handleKeyDown}
        aria-describedby="detalle-description"
      >
        <DrawerHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <DrawerTitle
                ref={titleRef}
                tabIndex={-1}
                className="text-base sm:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary rounded truncate"
              >
                Ficha: {activo.numeroInventario}
              </DrawerTitle>
              <DrawerDescription id="detalle-description" className="text-xs sm:text-sm">
                Información completa del activo
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
          {/* Identificación */}
          <Section title="Identificación" icon={Package}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Núm. Inventario" value={activo.numeroInventario} />
              <Field label="Descripción" value={activo.descripcion} />
            </div>
          </Section>

          {/* Datos Técnicos */}
          <Section title="Datos Técnicos" icon={Cpu}>
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Marca" value={activo.marca} />
              <Field label="Modelo" value={activo.modelo} />
              <Field label="Núm. Serie" value={activo.numeroSerie} />
            </div>
          </Section>

          {/* Información Fiscal */}
          <Section title="Información Fiscal" icon={Receipt}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Folio Factura" value={activo.folioFactura} />
              <Field label="Fecha Factura" value={formatDate(activo.fechaFactura)} />
              <Field label="Costo" value={formatCurrency(activo.costo)} />
              <Field label="Cuenta Contable" value={activo.ctaContableNombre || activo.idCuentaContable} />
            </div>
          </Section>

          {/* Clasificación */}
          <Section title="Clasificación" icon={Tags}>
            <Field label="Clasificación" value={activo.clasificacionCodigo || clasificacionCodigo || activo.clasificacionNombre || activo.clasificacion} />
          </Section>

          {/* Resguardante Actual */}
          <Section title="Resguardante Actual" icon={UserCircle}>
            {loadingResguardante ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : resguardante ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      resguardante.tipo === "Empleado"
                        ? "default"
                        : resguardante.tipo === "Institucion"
                        ? "secondary"
                        : "outline"
                    }
                    className="flex items-center gap-1"
                  >
                    {resguardante.tipo === "Empleado" ? (
                      <User className="h-3 w-3" />
                    ) : resguardante.tipo === "Institucion" ? (
                      <Building2 className="h-3 w-3" />
                    ) : null}
                    {resguardante.tipo}
                  </Badge>
                  <span className="font-medium text-foreground">{resguardante.nombre}</span>
                </div>

                {resguardante.tipo === "Empleado" && resguardante.nomina && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Nómina:</span> {resguardante.nomina}
                  </p>
                )}
                {resguardante.departamento && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Departamento:</span> {resguardante.departamento}
                  </p>
                )}
                {resguardante.puesto && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Puesto:</span> {resguardante.puesto}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Sin información disponible</p>
            )}
          </Section>

          {/* Estado y Fechas */}
          <Section title="Estado y Fechas" icon={Activity}>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Estatus:</span>
                <Badge className={getEstatusVariant(activo.estatus)}>
                  {activo.estatusNombre || activo.estatus}
                </Badge>
              </div>
              <Field label="Fecha Alta" value={formatDate(activo.fechaAlta)} />
              <Field label="Última Modificación" value={formatDate(activo.fechaModificacion)} />
            </div>
          </Section>

          {/* Observaciones */}
          {activo.observaciones && (
            <Section title="Observaciones" icon={FileText}>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {activo.observaciones}
              </p>
            </Section>
          )}
        </div>

        <DrawerFooter className="border-t px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button variant="outline" onClick={handleVerHistorico} className="flex-1 h-10 text-sm">
              <History className="h-4 w-4 mr-2 flex-shrink-0" />
              Ver Histórico
            </Button>
            <Button variant="outline" onClick={handlePrintLabel} className="flex-1 h-10 text-sm">
              <Printer className="h-4 w-4 mr-2 flex-shrink-0" />
              Imprimir Etiqueta
            </Button>
            <DrawerClose asChild>
              <Button variant="secondary" className="flex-1 h-10 text-sm">
                <X className="h-4 w-4 mr-2 flex-shrink-0" />
                Cerrar
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
