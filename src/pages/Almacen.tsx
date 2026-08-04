import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Warehouse, TrendingUp, Search, X, ChevronLeft, ChevronRight,
  Loader2, Package, Briefcase, Pencil, RefreshCw,
} from "lucide-react";
import { listActivos, getTotalCostoActivos } from "@/lib/api";
import { Activo } from "@/lib/types";
import { mapSqlToActivo } from "@/lib/mappers";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { ProtectedPage } from "@/components/ProtectedPage";
import { EditarActivoModal } from "@/components/modals/EditarActivoModal";
import { CambiarEstatusModal } from "@/components/modals/CambiarEstatusModal";
import { Clasificacion, CuentaContable } from "@/lib/types";
import { listClasificaciones, listCuentasContables } from "@/lib/api";

export default function Almacen() {
  const { toast } = useToast();
  const [data, setData] = useState<Activo[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCosto, setTotalCosto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Modales
  const [editingActivo, setEditingActivo] = useState<Activo | null>(null);
  const [cambiarEstatusActivo, setCambiarEstatusActivo] = useState<Activo | null>(null);
  const [clasificaciones, setClasificaciones] = useState<Clasificacion[]>([]);
  const [cuentasContables, setCuentasContables] = useState<CuentaContable[]>([]);

  useEffect(() => {
    Promise.all([listClasificaciones(), listCuentasContables()])
      .then(([clases, cuentas]) => { setClasificaciones(clases); setCuentasContables(cuentas); })
      .catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const filterParams = {
        estatus: 2,
        search: debouncedSearch || undefined,
        tipo: tipoFilter !== "ALL" ? parseInt(tipoFilter) : undefined,
      };
      const [response, costoTotal] = await Promise.all([
        listActivos({ ...filterParams, page, pageSize: 10 }),
        getTotalCostoActivos(filterParams),
      ]);
      setData(response.data.items.map(mapSqlToActivo));
      setTotal(response.data.total);
      setTotalCosto(costoTotal);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los bienes en almacén", variant: "destructive" });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [debouncedSearch, tipoFilter, page]);
  useEffect(() => { setPage(1); }, [debouncedSearch, tipoFilter]);

  const columns = [
    {
      key: "numeroInventario",
      label: "Núm. Inventario",
      render: (item: Activo) => <span className="font-medium">{item.numeroInventario}</span>,
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
      key: "tipo",
      label: "Tipo",
      render: (item: Activo) =>
        item.tipo === 1 ? (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
            <Package className="h-3 w-3" />
            Bien Mueble
          </Badge>
        ) : item.tipo === 2 ? (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100 gap-1">
            <Briefcase className="h-3 w-3" />
            Enser
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "marca", label: "Marca", render: (item: Activo) => item.marca || "—" },
    { key: "modelo", label: "Modelo", render: (item: Activo) => item.modelo || "—" },
    {
      key: "resguardante",
      label: "Resguardante",
      render: (item: Activo) =>
        item.ultimoNomina ? (
          <span className="text-sm">{item.ultimoNomina}</span>
        ) : (
          <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">Sin asignar</Badge>
        ),
    },
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
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">En Almacen</Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (item: Activo) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            title="Editar"
            onClick={(e) => { e.stopPropagation(); setEditingActivo(item); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            title="Cambiar estatus"
            onClick={(e) => { e.stopPropagation(); setCambiarEstatusActivo(item); }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (initialLoading) {
    return (
      <ProtectedPage requiredModulo="almacen">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedPage>
    );
  }

  const hasFilters = searchTerm !== "" || tipoFilter !== "ALL";

  return (
    <ProtectedPage requiredModulo="almacen">
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Almacen" }]} />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Almacen</h1>
            <p className="text-muted-foreground">
              Bienes muebles y enseres actualmente en estado de almacén.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              title="Total en Almacen"
              value={total}
              icon={Warehouse}
              description="Bienes en almacén"
            />
            <StatCard
              title="Valor Total"
              value={new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
                minimumFractionDigits: 0,
              }).format(totalCosto)}
              icon={TrendingUp}
              description="Valor acumulado en almacén"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Filtros</h3>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearchTerm(""); setTipoFilter("ALL"); }}
                  className="ml-auto"
                >
                  <X className="h-4 w-4 mr-1" /> Limpiar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Núm. inventario, descripción, marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los tipos</SelectItem>
                  <SelectItem value="1">Bienes Muebles</SelectItem>
                  <SelectItem value="2">Enseres</SelectItem>
                </SelectContent>
              </Select>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm">Página {page} de {Math.ceil(total / 10)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(Math.ceil(total / 10), p + 1))}
                  disabled={page >= Math.ceil(total / 10)}
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      <EditarActivoModal
        open={!!editingActivo}
        onOpenChange={(open) => { if (!open) setEditingActivo(null); }}
        activo={editingActivo}
        clasificaciones={clasificaciones}
        cuentasContables={cuentasContables}
        onSuccess={() => { setEditingActivo(null); loadData(); }}
        showAuditNotice={true}
      />

      <CambiarEstatusModal
        open={!!cambiarEstatusActivo}
        onOpenChange={(open) => { if (!open) setCambiarEstatusActivo(null); }}
        activo={cambiarEstatusActivo}
        onSuccess={() => { setCambiarEstatusActivo(null); loadData(); }}
      />
    </ProtectedPage>
  );
}
