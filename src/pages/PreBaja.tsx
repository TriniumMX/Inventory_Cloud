import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmarBajaMasivaDialog } from "@/components/modals/ConfirmarBajaMasivaDialog";
import { PackageX, TrendingUp, Search, X, ChevronLeft, ChevronRight, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { listActivos, getTotalCostoActivos, reactivarDesdePreBaja, confirmarBajaDefinitiva } from "@/lib/api";
import { Activo } from "@/lib/types";
import { mapSqlToActivo } from "@/lib/mappers";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { ProtectedPage } from "@/components/ProtectedPage";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { SecureButton } from "@/components/SecureButton";
import { useAuth } from "@/contexts/AuthContext";

export default function PreBaja() {
  const { toast } = useToast();
  const [data, setData] = useState<Activo[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCosto, setTotalCosto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { canEdit: canEditModulo } = useAuth();
  const canEdit = canEditModulo("pre-baja");

  const loadData = async () => {
    setLoading(true);
    try {
      const filterParams = { estatus: 3, search: debouncedSearch };
      const [response, costoTotal] = await Promise.all([
        listActivos({ ...filterParams, page, pageSize: 10 }),
        getTotalCostoActivos(filterParams),
      ]);
      setData(response.data.items.map(mapSqlToActivo));
      setTotal(response.data.total);
      setTotalCosto(costoTotal);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los bienes en pre-baja", variant: "destructive" });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [debouncedSearch, page]);
  useRealtimeRefresh("activos", loadData);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleToggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleToggleAll = () => {
    if (selected.size === data.length) setSelected(new Set());
    else setSelected(new Set(data.map((d) => d.id)));
  };

  const handleReactivar = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    try {
      await reactivarDesdePreBaja(Array.from(selected));
      toast({ title: "Bienes reactivados", description: `${selected.size} bien(es) volvieron a estatus ACTIVO` });
      setSelected(new Set());
      loadData();
    } catch {
      toast({ title: "Error", description: "No se pudieron reactivar los bienes", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBaja = async () => {
    const ids = selected.size > 0 ? Array.from(selected) : data.map((d) => d.id);
    setActionLoading(true);
    try {
      await confirmarBajaDefinitiva(ids);
      toast({ title: "Baja definitiva completada", description: `${ids.length} bien(es) dados de baja permanentemente` });
      setSelected(new Set());
      setConfirmOpen(false);
      loadData();
    } catch {
      toast({ title: "Error", description: "No se pudo completar la baja definitiva", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const selectedCosto = data.filter((d) => (selected.size > 0 ? selected.has(d.id) : true)).reduce((sum, d) => sum + d.costo, 0);
  const selectedCount = selected.size > 0 ? selected.size : total;

  const columns = [
    {
      key: "select",
      label: "☐",
      render: (item: Activo) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selected.has(item.id)}
            onChange={() => handleToggleSelect(item.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-border cursor-pointer"
          />
        </div>
      ),
    },
    {
      key: "numeroInventario",
      label: "Núm. Inventario",
      render: (item: Activo) => <span className="font-medium">{item.numeroInventario}</span>,
    },
    {
      key: "descripcion",
      label: "Descripción",
      render: (item: Activo) => <span className="max-w-xs truncate block" title={item.descripcion}>{item.descripcion}</span>,
    },
    { key: "marca", label: "Marca", render: (item: Activo) => item.marca || "—" },
    { key: "modelo", label: "Modelo", render: (item: Activo) => item.modelo || "—" },
    {
      key: "costo",
      label: "Costo",
      render: (item: Activo) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(item.costo),
    },
    {
      key: "estatus",
      label: "Estatus",
      render: () => (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">PRE-BAJA</Badge>
      ),
    },
  ];

  if (initialLoading) {
    return (
      <ProtectedPage requiredModulo="pre-baja">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredModulo="pre-baja">
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Pre-Baja" }]} />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pre-Baja</h1>
            <p className="text-muted-foreground">Bienes perfilados para baja definitiva. Puedes reactivarlos o confirmar su baja.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatCard title="Bienes en Pre-Baja" value={total} icon={PackageX} description="Pendientes de baja definitiva" />
            <StatCard
              title="Valor Total"
              value={new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(totalCosto)}
              icon={TrendingUp}
              description="Valor acumulado en pre-baja"
            />
          </div>

          {/* Search */}
          <div className="flex flex-col gap-4 bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Buscar</h3>
              {searchTerm && (
                <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="ml-auto">
                  <X className="h-4 w-4 mr-1" /> Limpiar
                </Button>
              )}
            </div>
            <Input placeholder="Núm. inventario, descripción, marca..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              {data.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleToggleAll}>
                  {selected.size === data.length && data.length > 0 ? "Deseleccionar todos" : "Seleccionar todos"}
                </Button>
              )}
              {selected.size > 0 && (
                <span className="text-sm text-muted-foreground">{selected.size} seleccionado(s)</span>
              )}
            </div>
            <div className="flex gap-2">
              {canEdit && selected.size > 0 && (
                <Button variant="outline" onClick={handleReactivar} disabled={actionLoading}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reactivar ({selected.size})
                </Button>
              )}
              {canEdit && total > 0 && (
                <SecureButton requiredRole={1} variant="destructive" onClick={() => setConfirmOpen(true)} disabled={actionLoading}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Baja Definitiva {selected.size > 0 ? `(${selected.size})` : `(${total})`}
                </SecureButton>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 bg-card rounded-lg border">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando...</span>
            </div>
          ) : (
            <DataTable data={data} columns={columns} searchable={false} />
          )}

          {total > 10 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * 10 + 1} a {Math.min(page * 10, total)} de {total}
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm">Página {page} de {Math.ceil(total / 10)}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(Math.ceil(total / 10), p + 1))} disabled={page >= Math.ceil(total / 10)}>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </main>

        <ConfirmarBajaMasivaDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          cantidad={selectedCount}
          valorTotal={selectedCosto}
          onConfirm={handleConfirmBaja}
          isLoading={actionLoading}
        />
      </div>
    </ProtectedPage>
  );
}
