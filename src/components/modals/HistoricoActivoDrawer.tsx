import { useState, useEffect, useMemo, useRef } from "react";
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
import { getAssetHistory, AssetHistoryItem, listConsignas } from "@/lib/api";
import { getEmployeeByNomina } from "@/lib/employees";
import { useToast } from "@/hooks/use-toast";
import { Clock, User, FileText, X, Building2, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface HistoricoActivoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroInventario: string;
  ultimoNomina?: string;
}

interface ResguardanteInfo {
  tipo: "Empleado" | "Institucion" | "Sin asignar";
  nombre: string;
  nomina?: string;
  departamento?: string;
  puesto?: string;
}

const CACHE_DURATION = 60000; // 60 segundos
const ITEMS_PER_PAGE = 50;

interface CachedData {
  items: AssetHistoryItem[];
  timestamp: number;
}

const cache = new Map<string, CachedData>();

export function HistoricoActivoDrawer({
  open,
  onOpenChange,
  numeroInventario,
  ultimoNomina,
}: HistoricoActivoDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AssetHistoryItem[]>([]);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Estado para resguardante actual
  const [resguardante, setResguardante] = useState<ResguardanteInfo | null>(null);
  const [loadingResguardante, setLoadingResguardante] = useState(false);
  const [nombresMap, setNombresMap] = useState<Map<string, string>>(new Map());

  // Cargar datos del resguardante actual
  const loadResguardante = async () => {
    if (!ultimoNomina) {
      setResguardante({ tipo: "Sin asignar", nombre: "Sin resguardante asignado" });
      return;
    }

    setLoadingResguardante(true);
    try {
      // Primero intentar buscar como empleado
      const empleado = await getEmployeeByNomina(ultimoNomina);
      if (empleado) {
        setResguardante({
          tipo: "Empleado",
          nombre: empleado.nombre,
          nomina: ultimoNomina,
          departamento: empleado.departamento,
          puesto: empleado.puesto,
        });
        return;
      }

      // Si no es empleado, buscar en instituciones
      const consignasResponse = await listConsignas();
      const institucion = consignasResponse.data.items.find(
        (c: { nombre: string }) => c.nombre.toLowerCase() === ultimoNomina.toLowerCase()
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
          nombre: ultimoNomina,
          nomina: ultimoNomina,
        });
      }
    } catch (error) {
      console.error("Error cargando resguardante:", error);
      setResguardante({
        tipo: "Empleado",
        nombre: ultimoNomina || "Desconocido",
        nomina: ultimoNomina,
      });
    } finally {
      setLoadingResguardante(false);
    }
  };

  // Cargar datos con cache
  const loadHistory = async () => {
    setLoading(true);

    // Verificar cache
    const cached = cache.get(numeroInventario);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      setItems(cached.items);
      setLoading(false);
      return;
    }

    try {
      const response = await getAssetHistory(numeroInventario);
      
      // Los datos ya vienen ordenados desde la API
      const sortedItems = response.data.items;

      setItems(sortedItems);

      // Guardar en cache
      cache.set(numeroInventario, {
        items: sortedItems,
        timestamp: now,
      });

      // Resolver nombres para nóminas únicas (solo las que parecen número)
      const nominasUnicas = [...new Set(
        sortedItems.map(i => i.usuario).filter(u => u && /^\d+$/.test(u.trim()))
      )];
      const map = new Map<string, string>();
      await Promise.allSettled(
        nominasUnicas.map(async (nom) => {
          try {
            const emp = await getEmployeeByNomina(nom);
            if (emp?.nombre) map.set(nom, emp.nombre);
          } catch { /* sin nombre, se muestra solo nómina */ }
        })
      );
      setNombresMap(map);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el histórico del activo",
        variant: "destructive",
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadHistory();
      loadResguardante();
      setDisplayCount(ITEMS_PER_PAGE);
      
      // Focus en el título al abrir
      setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
    }
  }, [open, numeroInventario, ultimoNomina]);

  // Items a mostrar con paginación
  const displayedItems = useMemo(() => {
    return items.slice(0, displayCount);
  }, [items, displayCount]);

  const hasMore = displayCount < items.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, items.length));
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="max-h-[92vh]"
        onKeyDown={handleKeyDown}
        aria-describedby="historico-description"
      >
        <DrawerHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <DrawerTitle
                ref={titleRef}
                tabIndex={-1}
                className="text-base sm:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary rounded truncate"
              >
                Histórico: {numeroInventario}
              </DrawerTitle>
              <DrawerDescription id="historico-description" className="text-xs sm:text-sm">
                Historial de resguardos del activo
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Sección Resguardante Actual */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-muted/50 rounded-lg border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Resguardante Actual
            </h3>

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
          </div>

          {/* Historial de movimientos */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin movimientos registrados</h3>
              <p className="text-muted-foreground max-w-md">
                Este activo no tiene movimientos registrados en el sistema
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Historial de Movimientos
              </h3>
              <div className="relative">
                {/* Línea vertical de la timeline */}
                <div className="absolute left-[17px] sm:left-6 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-4 sm:space-y-6">
                  {displayedItems.map((item, index) => {
                    const fecha = new Date(item.fecha);
                    const isVigente = item.tipo === "Resguardo Vigente";

                    return (
                      <div key={index} className="relative pl-10 sm:pl-16">
                        {/* Icono en la timeline */}
                        <div className="absolute left-0 flex items-center justify-center z-10">
                          <div
                            className={`h-9 w-9 sm:h-12 sm:w-12 rounded-full flex items-center justify-center bg-white dark:bg-gray-950 border-2 ${
                              isVigente
                                ? "border-secondary text-secondary"
                                : "border-muted-foreground/30 text-muted-foreground"
                            }`}
                          >
                            <User className="h-4 w-4 sm:h-6 sm:w-6" />
                          </div>
                        </div>

                        {/* Contenido */}
                        <div className="bg-card border rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-1">
                                <time className="text-xs sm:text-sm font-medium text-foreground">
                                  {format(fecha, "dd/MM/yyyy HH:mm", { locale: es })}
                                </time>
                                <Badge
                                  variant={isVigente ? "default" : "secondary"}
                                  className={`text-[10px] sm:text-xs ${
                                    isVigente
                                      ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                                      : ""
                                  }`}
                                >
                                  {item.tipo}
                                </Badge>
                              </div>
                              <p className="text-xs sm:text-base leading-snug">
                                <span className="font-semibold">Resguardante:</span>{" "}
                                {nombresMap.get(item.usuario)
                                  ? `${nombresMap.get(item.usuario)} (${item.usuario})`
                                  : item.usuario}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-[11px] sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                              <span className="truncate">{item.detalle}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <UserCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                              Realizado por: {item.realizadoPor}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botón cargar más */}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <Button variant="outline" onClick={handleLoadMore}>
                    Cargar más ({items.length - displayCount} restantes)
                  </Button>
                </div>
              )}
            </>
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
