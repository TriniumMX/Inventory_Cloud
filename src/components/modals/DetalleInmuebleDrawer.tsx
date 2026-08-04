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
import { getEmployeeByNomina } from "@/lib/employees";
import { uploadEscritura, deleteEscritura, getEscrituraSignedUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  MapPin,
  Ruler,
  FileText,
  DollarSign,
  UserCircle,
  MessageSquare,
  X,
  ExternalLink,
  Upload,
  Trash2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BienInmueble } from "@/lib/types";

interface DetalleInmuebleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inmueble: BienInmueble | null;
  onRefresh?: () => void;
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg border">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

export function DetalleInmuebleDrawer({
  open,
  onOpenChange,
  inmueble,
  onRefresh,
}: DetalleInmuebleDrawerProps) {
  const { toast } = useToast();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [responsableNombre, setResponsableNombre] = useState<string | null>(null);
  const [loadingResponsable, setLoadingResponsable] = useState(false);
  const [escrituraUrl, setEscrituraUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && inmueble) {
      setResponsableNombre(null);
      setEscrituraUrl(inmueble.escrituraUrl || null);

      if (inmueble.responsableNomina) {
        setLoadingResponsable(true);
        getEmployeeByNomina(inmueble.responsableNomina)
          .then((emp) => {
            setResponsableNombre(emp?.nombre || inmueble.responsableNomina!);
          })
          .catch(() => {
            setResponsableNombre(inmueble.responsableNomina!);
          })
          .finally(() => setLoadingResponsable(false));
      }

      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open, inmueble?.id]);

  const handleVerDocumento = async () => {
    if (!escrituraUrl) return;
    const url = await getEscrituraSignedUrl(escrituraUrl);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !inmueble) return;
    e.target.value = "";
    setUploading(true);
    try {
      const fileName = await uploadEscritura(inmueble.id, inmueble.numeroInventario, file);
      setEscrituraUrl(fileName);
      toast({ title: "Escritura subida", description: "El documento se guardó correctamente." });
      onRefresh?.();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo subir el archivo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleEliminar = async () => {
    if (!inmueble || !escrituraUrl) return;
    setDeleting(true);
    try {
      await deleteEscritura(inmueble.id, escrituraUrl);
      setEscrituraUrl(null);
      toast({ title: "Escritura eliminada" });
      onRefresh?.();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el documento", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return "—";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatSurface = (value?: number | null) => {
    if (value === undefined || value === null) return "—";
    return `${value.toLocaleString("es-MX", { maximumFractionDigits: 2 })} m²`;
  };

  if (!inmueble) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="max-h-[90vh]"
        aria-describedby="detalle-inmueble-description"
      >
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle
                ref={titleRef}
                tabIndex={-1}
                className="text-2xl focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                Ficha Técnica: {inmueble.numeroInventario}
              </DrawerTitle>
              <DrawerDescription id="detalle-inmueble-description">
                Información completa del bien inmueble
              </DrawerDescription>
            </div>
            <Badge
              className={
                inmueble.estatus === 1
                  ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                  : "bg-red-100 text-red-800 hover:bg-red-200"
              }
            >
              {inmueble.estatus === 1 ? "Activo" : "Baja"}
            </Badge>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Identificación */}
          <Section title="Identificación" icon={Building2}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Núm. Inventario" value={inmueble.numeroInventario} />
              <Field label="Nombre" value={inmueble.nombre} />
              <Field label="Tipo" value={inmueble.tipoNombre} />
              <Field label="Uso Actual" value={inmueble.usoActual} />
              <Field label="Niveles" value={inmueble.niveles} />
              <Field label="Descripción" value={inmueble.descripcion} />
            </div>
          </Section>

          {/* Ubicación */}
          <Section title="Ubicación" icon={MapPin}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Dirección" value={inmueble.direccion} />
              <Field label="Colonia" value={inmueble.colonia} />
              <Field label="C.P." value={inmueble.codigoPostal} />
              <Field label="Municipio" value={inmueble.municipio} />
              <Field label="Estado" value={inmueble.estado} />
              {(inmueble.latitud || inmueble.longitud) && (
                <Field
                  label="Coordenadas"
                  value={`${inmueble.latitud ?? "—"}, ${inmueble.longitud ?? "—"}`}
                />
              )}
            </div>
          </Section>

          {/* Superficies */}
          <Section title="Superficies" icon={Ruler}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Terreno" value={formatSurface(inmueble.superficieTerreno)} />
              <Field label="Construcción" value={formatSurface(inmueble.superficieConstruccion)} />
            </div>
          </Section>

          {/* Documentación Legal */}
          <Section title="Documentación Legal" icon={FileText}>
            <div className="grid gap-2 sm:grid-cols-2 mb-4">
              <Field label="Núm. Escritura" value={inmueble.numeroEscritura} />
              <Field label="Fecha Escritura" value={formatDate(inmueble.fechaEscritura)} />
              <Field label="Notaría" value={inmueble.notaria} />
              <Field label="Volumen / Libro" value={inmueble.volumenLibro} />
              <Field label="Folio Registro" value={inmueble.folioRegistro} />
              <Field label="Clave Catastral" value={inmueble.claveCatastral} />
            </div>

            {/* Archivo PDF de escritura */}
            <div className="border-t pt-3 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Archivo de Escritura (PDF)</p>
              <div className="flex flex-wrap gap-2 items-center">
                {escrituraUrl ? (
                  <>
                    <Button size="sm" variant="outline" onClick={handleVerDocumento}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Ver documento
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleEliminar}
                      disabled={deleting}
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                      Eliminar
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin archivo adjunto</p>
                )}
                <label className="cursor-pointer">
                  <Button size="sm" variant="secondary" asChild disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                      {escrituraUrl ? "Reemplazar" : "Subir PDF"}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          </Section>

          {/* Valores */}
          <Section title="Valores" icon={DollarSign}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Valor Catastral" value={formatCurrency(inmueble.valorCatastral)} />
              <Field label="Valor Comercial" value={formatCurrency(inmueble.valorComercial)} />
              <Field label="Costo Adquisición" value={formatCurrency(inmueble.costoAdquisicion)} />
              <Field label="Fecha Adquisición" value={formatDate(inmueble.fechaAdquisicion)} />
              <Field label="Cuenta Contable" value={inmueble.ctaContableNombre} />
            </div>
          </Section>

          {/* Responsable */}
          <Section title="Responsable" icon={UserCircle}>
            {!inmueble.responsableNomina ? (
              <p className="text-sm text-muted-foreground">Sin responsable asignado</p>
            ) : loadingResponsable ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{responsableNombre}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Nómina:</span> {inmueble.responsableNomina}
                </p>
              </div>
            )}
          </Section>

          {/* Observaciones */}
          {inmueble.observaciones && (
            <Section title="Observaciones" icon={MessageSquare}>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {inmueble.observaciones}
              </p>
            </Section>
          )}
        </div>

        <DrawerFooter className="border-t">
          <DrawerClose asChild>
            <Button variant="secondary" className="w-full">
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
