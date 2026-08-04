import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Search, X, ChevronLeft, ChevronRight,
  Loader2, Plus, Pencil, Trash2, FileDown, ArrowLeftRight,
  CheckCircle, User, Package, Building2, Shield, FileText,
  Settings, RefreshCw,
} from "lucide-react";
import { getAuditLogs, AuditLogEntry } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { ProtectedPage } from "@/components/ProtectedPage";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PAGE_SIZE = 20;

// Nombres amigables para los campos técnicos
const CAMPO_LABELS: Record<string, string> = {
  descripcion: "Descripción",
  marca: "Marca",
  modelo: "Modelo",
  numero_serie: "Número de Serie",
  clasificacion: "Clasificación",
  id_cta_contable: "Cuenta Contable",
  costo: "Costo",
  f_factura: "Fecha de Factura",
  f_alta: "Fecha de Alta",
  folio_factura: "Folio de Factura",
  observaciones: "Observaciones",
  estatus: "Estatus",
  nomina: "Nómina / Resguardante",
  asignacion: "Asignación",
  responsable: "Responsable",
  nombre: "Nombre",
  usuario: "Usuario",
  permisos: "Permisos",
  password: "Contraseña",
  tipo: "Tipo",
};

const TABLA_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  activos: { label: "Bienes Muebles / Enseres", icon: Package, color: "text-blue-600" },
  bienes_inmuebles: { label: "Bienes Inmuebles", icon: Building2, color: "text-purple-600" },
  resguardos: { label: "Resguardos", icon: Shield, color: "text-green-600" },
  revisiones: { label: "Revisiones", icon: RefreshCw, color: "text-orange-600" },
  usuarios: { label: "Usuarios", icon: User, color: "text-pink-600" },
  reportes: { label: "Reportes", icon: FileText, color: "text-teal-600" },
  sistema: { label: "Sistema", icon: Settings, color: "text-gray-600" },
};

const ACCION_CONFIG: Record<string, { label: string; icon: React.ElementType; badgeCls: string }> = {
  CREATE: { label: "Registro", icon: Plus, badgeCls: "bg-green-100 text-green-800 border-green-200" },
  UPDATE: { label: "Modificación", icon: Pencil, badgeCls: "bg-blue-100 text-blue-800 border-blue-200" },
  DELETE: { label: "Baja / Eliminación", icon: Trash2, badgeCls: "bg-red-100 text-red-800 border-red-200" },
  EXPORT: { label: "Exportación", icon: FileDown, badgeCls: "bg-purple-100 text-purple-800 border-purple-200" },
  TRASPASAR: { label: "Traspaso", icon: ArrowLeftRight, badgeCls: "bg-orange-100 text-orange-800 border-orange-200" },
  FINALIZAR: { label: "Finalización", icon: CheckCircle, badgeCls: "bg-teal-100 text-teal-800 border-teal-200" },
};

function buildSentence(entry: AuditLogEntry): string {
  const campo = entry.campo ? (CAMPO_LABELS[entry.campo] ?? entry.campo) : null;
  switch (entry.accion) {
    case "CREATE":
      return entry.valor_nuevo ? `Registró: ${entry.valor_nuevo}` : "Creó un nuevo registro";
    case "UPDATE":
      if (campo && entry.valor_anterior && entry.valor_nuevo)
        return `Cambió ${campo} de "${entry.valor_anterior}" a "${entry.valor_nuevo}"`;
      if (campo && entry.valor_nuevo)
        return `Asignó ${campo}: "${entry.valor_nuevo}"`;
      return campo ? `Actualizó ${campo}` : "Modificó un registro";
    case "DELETE":
      return entry.valor_anterior
        ? `Eliminó / dio de baja: ${entry.valor_anterior}`
        : "Eliminó un registro";
    case "EXPORT":
      return entry.valor_nuevo ? `Exportó reporte: ${entry.valor_nuevo}` : "Exportó un reporte";
    case "TRASPASAR":
      if (entry.valor_anterior && entry.valor_nuevo)
        return `Traspasó de "${entry.valor_anterior}" a "${entry.valor_nuevo}"`;
      return "Realizó un traspaso";
    case "FINALIZAR":
      return "Finalizó la revisión";
    default:
      return entry.accion;
  }
}

function groupByDay(entries: AuditLogEntry[]): { day: string; items: AuditLogEntry[] }[] {
  const map = new Map<string, AuditLogEntry[]>();
  for (const e of entries) {
    let day = "—";
    try { day = format(new Date(e.created_at), "EEEE, d 'de' MMMM yyyy", { locale: es }); } catch { /* keep — */ }
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(e);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

export default function Auditoria() {
  const { toast } = useToast();
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const [usuarioSearch, setUsuarioSearch] = useState("");
  const [tablaFilter, setTablaFilter] = useState("ALL");
  const [accionFilter, setAccionFilter] = useState("ALL");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);

  const debouncedUsuario = useDebounce(usuarioSearch, 300);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getAuditLogs({
        tabla: tablaFilter !== "ALL" ? tablaFilter : undefined,
        accion: accionFilter !== "ALL" ? accionFilter : undefined,
        usuario: debouncedUsuario || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setData(result.items);
      setTotal(result.total);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la bitácora", variant: "destructive" });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [debouncedUsuario, tablaFilter, accionFilter, fechaDesde, fechaHasta, page]);
  useEffect(() => { setPage(1); }, [debouncedUsuario, tablaFilter, accionFilter, fechaDesde, fechaHasta]);

  const hasFilters = usuarioSearch !== "" || tablaFilter !== "ALL" || accionFilter !== "ALL" || fechaDesde !== "" || fechaHasta !== "";
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const groups = groupByDay(data);

  if (initialLoading) {
    return (
      <ProtectedPage requiredModulo="auditoria">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredRole={1}>
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Bitácora" }]} />
        <main className="flex-1 overflow-auto p-6 space-y-6">

          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Bitácora del Sistema</h1>
              <p className="text-sm text-muted-foreground">
                {total.toLocaleString("es-MX")} {total === 1 ? "registro" : "registros"} en total
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-xl border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Filtros</span>
              {hasFilters && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { setUsuarioSearch(""); setTablaFilter("ALL"); setAccionFilter("ALL"); setFechaDesde(""); setFechaHasta(""); }}
                  className="ml-auto h-7 text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Limpiar filtros
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                placeholder="Buscar por usuario o nombre..."
                value={usuarioSearch}
                onChange={(e) => setUsuarioSearch(e.target.value)}
                className="text-sm"
              />
              <Select value={tablaFilter} onValueChange={setTablaFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los módulos</SelectItem>
                  <SelectItem value="activos">Bienes Muebles / Enseres</SelectItem>
                  <SelectItem value="bienes_inmuebles">Bienes Inmuebles</SelectItem>
                  <SelectItem value="resguardos">Resguardos</SelectItem>
                  <SelectItem value="revisiones">Revisiones</SelectItem>
                  <SelectItem value="usuarios">Usuarios</SelectItem>
                  <SelectItem value="reportes">Reportes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={accionFilter} onValueChange={setAccionFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Tipo de acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las acciones</SelectItem>
                  <SelectItem value="CREATE">Registros nuevos</SelectItem>
                  <SelectItem value="UPDATE">Modificaciones</SelectItem>
                  <SelectItem value="DELETE">Bajas / Eliminaciones</SelectItem>
                  <SelectItem value="EXPORT">Exportaciones</SelectItem>
                  <SelectItem value="TRASPASAR">Traspasos</SelectItem>
                  <SelectItem value="FINALIZAR">Finalizaciones</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="text-sm" title="Desde" />
                <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="text-sm" title="Hasta" />
              </div>
            </div>
          </div>

          {/* Feed */}
          {loading ? (
            <div className="flex items-center justify-center py-16 bg-card rounded-xl border">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground text-sm">Cargando bitácora...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border gap-3 text-muted-foreground">
              <ClipboardList className="h-10 w-10 opacity-30" />
              <p className="text-sm">No hay registros que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map(({ day, items }) => (
                <div key={day}>
                  {/* Day header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground capitalize">
                      {day}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{items.length} eventos</span>
                  </div>

                  {/* Entry cards */}
                  <div className="space-y-2">
                    {items.map((entry) => {
                      const tablaConf = TABLA_CONFIG[entry.tabla] ?? { label: entry.tabla, icon: Settings, color: "text-gray-500" };
                      const accionConf = ACCION_CONFIG[entry.accion] ?? { label: entry.accion, icon: Settings, badgeCls: "bg-gray-100 text-gray-700 border-gray-200" };
                      const TablaIcon = tablaConf.icon;
                      const AccionIcon = accionConf.icon;
                      let timeStr = "—";
                      try { timeStr = format(new Date(entry.created_at), "HH:mm:ss"); } catch { /* keep — */ }

                      return (
                        <div key={entry.id} className="flex gap-3 bg-card hover:bg-muted/40 transition-colors rounded-xl border px-4 py-3">
                          {/* Left: module icon */}
                          <div className={`flex-shrink-0 mt-0.5 ${tablaConf.color}`}>
                            <TablaIcon className="h-4 w-4" />
                          </div>

                          {/* Center: main info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Sentence */}
                            <p className="text-sm font-medium leading-snug">
                              {buildSentence(entry)}
                            </p>

                            {/* Asset name if available */}
                            {entry.descripcion_registro && (
                              <p className="text-xs text-muted-foreground truncate">
                                <span className="font-medium">Bien:</span> {entry.descripcion_registro}
                              </p>
                            )}

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {entry.nombre_usuario || entry.usuario}
                              </span>
                              <span className="text-xs text-muted-foreground opacity-50">·</span>
                              <span className="text-xs text-muted-foreground">{tablaConf.label}</span>
                            </div>
                          </div>

                          {/* Right: badge + time */}
                          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                            <Badge className={`${accionConf.badgeCls} border text-[10px] font-semibold gap-1 px-1.5 py-0.5`}>
                              <AccionIcon className="h-2.5 w-2.5" />
                              {accionConf.label}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground font-mono">{timeStr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total.toLocaleString("es-MX")}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm px-2">Página {page} de {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

        </main>
      </div>
    </ProtectedPage>
  );
}
