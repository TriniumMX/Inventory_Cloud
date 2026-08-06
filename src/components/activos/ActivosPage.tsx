import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NuevoActivoModal } from "@/components/modals/NuevoActivoModal";
import { EditarActivoModal } from "@/components/modals/EditarActivoModal";
import { HistoricoActivoDrawer } from "@/components/modals/HistoricoActivoDrawer";
import { DetalleActivoDrawer } from "@/components/modals/DetalleActivoDrawer";
import { OpcionesImpresionModal } from "@/components/modals/OpcionesImpresionModal";
import { TrendingUp, AlertTriangle, Plus, Eye, Edit, Search, X, ChevronLeft, ChevronRight, History, Printer, ArrowLeftRight, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ReasignarBienModal } from "@/components/modals/ReasignarBienModal";
import type { LabelPreferences } from "@/lib/labelUtils";
import { listActivos, getTotalCostoActivos } from "@/lib/api";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { Activo } from "@/lib/types";
import { mapSqlToActivo } from "@/lib/mappers";
import { useCatalogCache } from "@/hooks/useCatalogCache";
import { useDebounce } from "@/hooks/useDebounce";
import { ClasificacionCombobox } from "@/components/shared/ClasificacionCombobox";
import { useToast } from "@/hooks/use-toast";
import { ProtectedPage } from "@/components/ProtectedPage";
import { SecureButton } from "@/components/SecureButton";
import { useAuth } from "@/contexts/AuthContext";

interface ActivosPageProps {
  tipo: 1 | 2;
  moduloClave: string;          // clave del módulo para control de acceso granular
  titulo: string;
  subtitulo: string;
  icono: LucideIcon;
  breadcrumbLabel: string;
  labelSingular: string;
  labelPlural: string;
  statDescription: string;
  valorDescription: string;
  addButtonLabel: string;
}

export default function ActivosPage({
  tipo,
  moduloClave,
  titulo,
  subtitulo,
  icono: IconComponent,
  breadcrumbLabel,
  labelSingular,
  labelPlural,
  statDescription,
  valorDescription,
  addButtonLabel,
}: ActivosPageProps) {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Activo[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCosto, setTotalCosto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Permisos
  const { canEdit: canEditModulo } = useAuth();
  const canEdit = canEditModulo(moduloClave);

  // Modales
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [drawerHistoricoOpen, setDrawerHistoricoOpen] = useState(false);
  const [drawerDetalleOpen, setDrawerDetalleOpen] = useState(false);
  const [activoSeleccionado, setActivoSeleccionado] = useState<Activo | null>(null);
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [modalOpcionesImpresionOpen, setModalOpcionesImpresionOpen] = useState(false);
  const [modalReasignarOpen, setModalReasignarOpen] = useState(false);

  // Filtros desde URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [clasificacionFilter, setClasificacionFilter] = useState(
    searchParams.get("clasificacion") || ""
  );
  const [estatusFilter, setEstatusFilter] = useState(searchParams.get("estatus") || "");
  const [sinResguardante, setSinResguardante] = useState(false);
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));

  // Debounce para búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Cargar catálogos con cache
  const { clasificaciones, cuentasContables } = useCatalogCache();

  // Crear diccionarios para enriquecer datos
  const clasificacionesMap = new Map(
    clasificaciones.map((c) => [c.codigo, c.nombre])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      let estatusNum: number | undefined;
      if (estatusFilter === "ACTIVO") estatusNum = 1;
      else if (estatusFilter === "BAJA") estatusNum = 0;
      else if (estatusFilter === "ALMACEN") estatusNum = 2;
      else if (estatusFilter === "PRE-BAJA") estatusNum = 3;

      const filterParams = {
        tipo,
        search: debouncedSearchTerm,
        clasificacion: clasificacionFilter ? parseInt(clasificacionFilter) : undefined,
        estatus: estatusNum,
        sinResguardante: sinResguardante || undefined,
      };

      const [response, costoTotal] = await Promise.all([
        listActivos({
          ...filterParams,
          page,
          pageSize: 10,
        }),
        getTotalCostoActivos(filterParams),
      ]);

      let activos = response.data.items.map(mapSqlToActivo);

      activos = activos.map((activo) => ({
        ...activo,
        clasificacionNombre:
          activo.clasificacionNombre ||
          clasificacionesMap.get(activo.clasificacion) ||
          "—",
      }));

      setData(activos);
      setTotal(response.data.total);
      setTotalCosto(costoTotal);
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudieron cargar los ${labelPlural.toLowerCase()}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [debouncedSearchTerm, clasificacionFilter, estatusFilter, sinResguardante, page]);

  useRealtimeRefresh("activos", loadData);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearchTerm) params.q = debouncedSearchTerm;
    if (clasificacionFilter) params.clasificacion = clasificacionFilter;
    if (estatusFilter) params.estatus = estatusFilter;
    if (page > 1) params.page = page.toString();
    setSearchParams(params, { replace: true });
  }, [debouncedSearchTerm, clasificacionFilter, estatusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, clasificacionFilter, estatusFilter, sinResguardante]);

  const handleEditar = (activo: Activo) => {
    setActivoSeleccionado(activo);
    setModalEditarOpen(true);
  };

  const handleHistorico = (activo: Activo) => {
    setActivoSeleccionado(activo);
    setDrawerHistoricoOpen(true);
  };

  const handleVerDetalles = (activo: Activo) => {
    setActivoSeleccionado(activo);
    setDrawerDetalleOpen(true);
  };

  const handleReasignar = (activo: Activo) => {
    setActivoSeleccionado(activo);
    setModalReasignarOpen(true);
  };

  const handleToggleSelectForPrint = (numeroInventario: string) => {
    setSelectedForPrint((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(numeroInventario)) {
        newSet.delete(numeroInventario);
      } else {
        newSet.add(numeroInventario);
      }
      return newSet;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedForPrint.size === filteredData.length) {
      setSelectedForPrint(new Set());
    } else {
      setSelectedForPrint(new Set(filteredData.map((item) => item.numeroInventario)));
    }
  };

  const handlePrintBatch = () => {
    if (selectedForPrint.size === 0) {
      toast({
        title: "Sin selección",
        description: `Selecciona al menos un ${labelSingular.toLowerCase()} para imprimir etiquetas`,
        variant: "destructive",
      });
      return;
    }

    setModalOpcionesImpresionOpen(true);
  };

  const handleConfirmPrint = (prefs: LabelPreferences) => {
    const ids = Array.from(selectedForPrint).join(",");
    const params = new URLSearchParams({
      ids,
      dpi: prefs.dpi.toString(),
      qr: prefs.showQr ? "1" : "0",
      txt: prefs.showBarcodeText ? "1" : "0",
      copies: prefs.copies.toString(),
    });
    window.open(`/etiquetas/lote?${params.toString()}`, "_blank");
  };

  const columns = [
    {
      key: "select",
      label: "☐",
      render: (item: Activo) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedForPrint.has(item.numeroInventario)}
            onChange={() => handleToggleSelectForPrint(item.numeroInventario)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-border cursor-pointer"
            title="Seleccionar para imprimir"
          />
        </div>
      ),
    },
    { 
      key: "numeroInventario", 
      label: "Código / Núm. Inventario",
      render: (item: Activo) => (
        <span className="font-medium">{item.numeroInventario}</span>
      ),
    },
    { 
      key: "descripcion", 
      label: "Descripción",
      render: (item: Activo) => (
        <span className="max-w-xs truncate block" title={item.descripcion}>
          {item.descripcion}
        </span>
      ),
    },
    {
      key: "marca",
      label: "Marca",
      mobileHide: true,
      render: (item: Activo) => item.marca || "—",
    },
    {
      key: "modelo",
      label: "Modelo",
      mobileHide: true,
      render: (item: Activo) => item.modelo || "—",
    },
    {
      key: "numeroSerie",
      label: "Serie",
      mobileHide: true,
      render: (item: Activo) => item.numeroSerie || "—",
    },
    {
      key: "clasificacionNombre",
      label: "Clasificación",
      mobileHide: true,
      render: (item: Activo) => item.clasificacionNombre || "—",
    },
    {
      key: "estatus",
      label: "Estatus",
      render: (item: Activo) => (
        <Badge
          variant={item.estatus === "ACTIVO" ? "default" : "secondary"}
          className={
            item.estatus === "ACTIVO"
              ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
              : item.estatus === "ALMACEN"
              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              : item.estatus === "PRE-BAJA"
              ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
              : "bg-red-100 text-red-800 hover:bg-red-200"
          }
        >
          {item.estatusNombre || item.estatus}
        </Badge>
      ),
    },
    {
      key: "fechaAlta",
      label: "Fecha de Alta",
      mobileHide: true,
      render: (item: Activo) =>
        item.fechaAlta
          ? new Date(item.fechaAlta + "T00:00:00").toLocaleDateString("es-MX")
          : "—",
    },
    {
      key: "costo",
      label: "Costo",
      mobileHide: true,
      render: (item: Activo) =>
        new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(item.costo),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (item: Activo) => (
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            title="Ver detalles"
            onClick={() => handleVerDetalles(item)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            title="Histórico"
            onClick={() => handleHistorico(item)}
          >
            <History className="h-4 w-4" />
          </Button>
          {canEdit && item.estatus === "ACTIVO" && (
            <Button 
              variant="ghost" 
              size="sm" 
              title={`Reasignar ${labelSingular.toLowerCase()}`}
              onClick={() => handleReasignar(item)}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          )}
          {canEdit && (
            <Button 
              variant="ghost" 
              size="sm" 
              title={item.estatus === "BAJA" ? `No se puede editar un ${labelSingular.toLowerCase()} dado de baja` : "Editar"}
              onClick={() => handleEditar(item)}
              disabled={item.estatus === "BAJA"}
              className={item.estatus === "BAJA" ? "opacity-50 cursor-not-allowed" : ""}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const filteredData = data;

  const handleClearFilters = () => {
    setSearchTerm("");
    setClasificacionFilter("");
    setEstatusFilter("");
    setSinResguardante(false);
    setPage(1);
  };

  const hasActiveFilters = searchTerm || clasificacionFilter || estatusFilter || sinResguardante;

  if (initialLoading) {
    return (
      <ProtectedPage requiredModulo={moduloClave}>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredRole={3}>
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: breadcrumbLabel }]} />
        <main className="flex-1 overflow-auto p-3 sm:p-6 space-y-3 sm:space-y-6">
          {/* Header Section */}
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight truncate">{titulo}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">{subtitulo}</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
            <StatCard
              title={`Total ${labelPlural}`}
              value={total}
              icon={IconComponent}
              description={statDescription}
            />
            <StatCard
              title="Valor Total"
              value={new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(totalCosto)}
              icon={TrendingUp}
              description={valorDescription}
            />
            <div className="col-span-2 sm:col-span-1">
              <StatCard
                title="En Almacen"
                value={data.filter((item) => item.estatus === "ALMACEN").length}
                icon={AlertTriangle}
                description="Requieren atención"
              />
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex flex-col gap-2 sm:gap-3 bg-card rounded-xl border border-border p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              <h3 className="font-semibold text-xs sm:text-sm">Filtros</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="ml-auto h-7 px-2 text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>

            {/* Mobile: buscar fila completa, clasificación+estatus lado a lado */}
            <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Buscar</label>
                <Input
                  placeholder="Núm. inventario o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Clasificación</label>
                <ClasificacionCombobox
                  clasificaciones={clasificaciones}
                  value={clasificacionFilter || "ALL"}
                  onValueChange={(val) => setClasificacionFilter(val === "ALL" ? "" : val)}
                  showCode
                  allOption
                  allLabel="Todas"
                  triggerClassName="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Estatus</label>
                <Select value={estatusFilter || "ALL"} onValueChange={(val) => setEstatusFilter(val === "ALL" ? "" : val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="ACTIVO">Activo</SelectItem>
                    <SelectItem value="ALMACEN">Almacen</SelectItem>
                    <SelectItem value="PRE-BAJA">Pre-Baja</SelectItem>
                    <SelectItem value="BAJA">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id={`sin-resguardante-${tipo}`}
                checked={sinResguardante}
                onCheckedChange={setSinResguardante}
              />
              <Label htmlFor={`sin-resguardante-${tipo}`} className="text-xs cursor-pointer text-muted-foreground">
                Solo sin resguardante asignado
              </Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            {filteredData.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleSelectAll}
                className="text-[11px] sm:text-xs h-8 px-2 sm:px-3"
              >
                {selectedForPrint.size === filteredData.length && filteredData.length > 0
                  ? "Deseleccionar"
                  : "Seleccionar todos"}
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {selectedForPrint.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintBatch}
                  className="h-9 text-xs"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Imprimir etiquetas</span>
                  <span className="sm:hidden">Imprimir</span>
                  <span className="ml-1">({selectedForPrint.size})</span>
                </Button>
              )}
              <SecureButton
                requiredModulo={moduloClave}
                onClick={() => setModalNuevoOpen(true)}
                size="sm"
                className="h-9 text-xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">{addButtonLabel}</span>
                <span className="sm:hidden">Agregar</span>
              </SecureButton>
            </div>
          </div>

          {/* ── LISTA MÓVIL (cards) ── */}
          {loading ? (
            <div className="flex items-center justify-center py-12 bg-card rounded-xl border border-border shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
            </div>
          ) : (
            <>
              {/* Tarjetas — sólo visible en móvil */}
              <div className="sm:hidden space-y-2">
                {filteredData.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground bg-card border border-border rounded-xl">
                    No se encontraron resultados
                  </div>
                ) : (
                  filteredData.map((item, index) => (
                    <div key={index} className="bg-card border border-border rounded-xl p-3 space-y-2">
                      {/* Fila 1: checkbox + núm. inventario + estatus */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedForPrint.has(item.numeroInventario)}
                            onChange={() => handleToggleSelectForPrint(item.numeroInventario)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 mt-0.5 rounded border-border cursor-pointer flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wider leading-none">
                              {item.numeroInventario}
                            </p>
                            <p className="text-sm font-semibold text-foreground leading-snug mt-1 line-clamp-2">
                              {item.descripcion}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={item.estatus === "ACTIVO" ? "default" : "secondary"}
                          className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 ${
                            item.estatus === "ACTIVO"
                              ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                              : item.estatus === "ALMACEN"
                              ? "bg-yellow-100 text-yellow-800"
                              : item.estatus === "PRE-BAJA"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.estatusNombre || item.estatus}
                        </Badge>
                      </div>

                      {/* Fila 2: marca/modelo + costo */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pl-6">
                        <span>
                          {[item.marca, item.modelo].filter(Boolean).join(" · ") || "Sin marca/modelo"}
                        </span>
                        <span className="font-semibold text-foreground">
                          {new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: "MXN",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(item.costo)}
                        </span>
                      </div>

                      {/* Fila 3: acciones */}
                      <div className="flex items-center gap-0.5 pt-1 border-t border-border/50 pl-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 flex-1 text-[11px] font-semibold gap-1"
                          onClick={() => handleVerDetalles(item)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detalle
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 flex-1 text-[11px] font-semibold gap-1"
                          onClick={() => handleHistorico(item)}
                        >
                          <History className="h-3.5 w-3.5" />
                          Historial
                        </Button>
                        {canEdit && item.estatus === "ACTIVO" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 flex-1 text-[11px] font-semibold gap-1"
                            onClick={() => handleReasignar(item)}
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            Reasignar
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 flex-1 text-[11px] font-semibold gap-1 ${item.estatus === "BAJA" ? "opacity-40" : ""}`}
                            onClick={() => handleEditar(item)}
                            disabled={item.estatus === "BAJA"}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Tabla — sólo visible en desktop */}
              <div className="hidden sm:block">
                <DataTable data={filteredData} columns={columns} searchable={false} />
              </div>
            </>
          )}

          {/* Paginación */}
          {total > 10 && (
            <div className="flex items-center justify-between gap-3 border-t pt-3 sm:pt-4">
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} de {total}
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 px-2 sm:px-3"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1">Anterior</span>
                </Button>
                <span className="text-[11px] sm:text-xs text-muted-foreground min-w-[70px] text-center">
                  Pág. {page} / {Math.ceil(total / 10)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(Math.ceil(total / 10), p + 1))}
                  disabled={page >= Math.ceil(total / 10)}
                  className="h-8 px-2 sm:px-3"
                >
                  <span className="hidden sm:inline mr-1">Siguiente</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </main>

        <NuevoActivoModal 
          open={modalNuevoOpen} 
          onOpenChange={setModalNuevoOpen}
          clasificaciones={clasificaciones}
          cuentasContables={cuentasContables}
          onSuccess={loadData}
          tipo={tipo}
        />

        <EditarActivoModal
          open={modalEditarOpen}
          onOpenChange={setModalEditarOpen}
          activo={activoSeleccionado}
          clasificaciones={clasificaciones}
          cuentasContables={cuentasContables}
          onSuccess={loadData}
        />

        <HistoricoActivoDrawer
          open={drawerHistoricoOpen}
          onOpenChange={setDrawerHistoricoOpen}
          numeroInventario={activoSeleccionado?.numeroInventario || ""}
          ultimoNomina={activoSeleccionado?.ultimoNomina}
        />

        <DetalleActivoDrawer
          open={drawerDetalleOpen}
          onOpenChange={setDrawerDetalleOpen}
          activo={activoSeleccionado}
          onVerHistorico={() => {
            if (activoSeleccionado) {
              setDrawerHistoricoOpen(true);
            }
          }}
        />

        <OpcionesImpresionModal
          open={modalOpcionesImpresionOpen}
          onOpenChange={setModalOpcionesImpresionOpen}
          selectedInventoryCodes={Array.from(selectedForPrint)}
          onConfirm={handleConfirmPrint}
        />

        <ReasignarBienModal
          open={modalReasignarOpen}
          onOpenChange={setModalReasignarOpen}
          bien={activoSeleccionado ? {
            id: activoSeleccionado.id,
            numeroInventario: activoSeleccionado.numeroInventario,
            descripcion: activoSeleccionado.descripcion,
            marca: activoSeleccionado.marca,
            modelo: activoSeleccionado.modelo,
          } : null}
          destinatarioActual={activoSeleccionado?.ultimoNomina || "Sin asignar"}
          onSuccess={() => {
            loadData();
            setModalReasignarOpen(false);
          }}
        />
      </div>
    </ProtectedPage>
  );
}
