import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, CheckCircle2, XCircle, Plus, Edit, Trash2, Search, X, Loader2 } from "lucide-react";
import { listInstituciones, deleteInstitucion, type Institucion } from "@/lib/apiInstituciones";
import { NuevoInstitucionModal } from "@/components/modals/NuevoInstitucionModal";
import { EditarInstitucionModal } from "@/components/modals/EditarInstitucionModal";
import { EliminarInstitucionDialog } from "@/components/modals/EliminarInstitucionDialog";
import { ProtectedPage } from "@/components/ProtectedPage";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";

export default function Instituciones() {
  const { toast } = useToast();
  const [data, setData] = useState<Institucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [dialogEliminarOpen, setDialogEliminarOpen] = useState(false);
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState<Institucion | null>(null);

  const loadInstituciones = async () => {
    setLoading(true);
    try {
      const response = await listInstituciones({ q: debouncedSearchTerm });
      setData(response.items);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar las instituciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstituciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const handleEditar = (institucion: Institucion) => {
    setInstitucionSeleccionada(institucion);
    setModalEditarOpen(true);
  };

  const handleEliminar = (institucion: Institucion) => {
    setInstitucionSeleccionada(institucion);
    setDialogEliminarOpen(true);
  };

  const confirmarEliminar = async () => {
    if (!institucionSeleccionada) return;
    try {
      await deleteInstitucion(institucionSeleccionada.id);
      toast({ title: "Institución eliminada", description: `Se eliminó ${institucionSeleccionada.nombre}` });
      setDialogEliminarOpen(false);
      setInstitucionSeleccionada(null);
      loadInstituciones();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la institución",
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      key: "nombre",
      label: "Institución",
      render: (item: Institucion) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-slate-800 truncate">{item.nombre}</span>
        </div>
      ),
    },
    {
      key: "estatus",
      label: "Estatus",
      render: (item: Institucion) => (
        <Badge
          variant="outline"
          className={`text-[11px] font-bold px-2 py-0.5 border ${
            item.estatus === 1
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          {item.estatus === 1 ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (item: Institucion) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Editar"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => handleEditar(item)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Eliminar"
            className="h-8 w-8 p-0 rounded-lg hover:text-red-500 hover:bg-red-50"
            onClick={() => handleEliminar(item)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const activas = data.filter((i) => i.estatus === 1);
  const inactivas = data.filter((i) => i.estatus !== 1);

  return (
    <ProtectedPage requiredRole={1}>
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Instituciones" }]} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Instituciones</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Instituciones en comodato usadas al crear resguardos
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            <StatCard title="Total de Instituciones" value={data.length} icon={Building2} description="Instituciones registradas" />
            <StatCard title="Activas" value={activas.length} icon={CheckCircle2} description="Disponibles para resguardos" accentColor="emerald" />
            <StatCard title="Inactivas" value={inactivas.length} icon={XCircle} description="No disponibles" accentColor="amber" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar institución..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
                aria-label="Buscar instituciones"
              />
            </div>
            {searchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="h-9 px-3">
                <X className="mr-1.5 h-3.5 w-3.5" />
                Limpiar
              </Button>
            )}
            <Button onClick={() => setModalNuevoOpen(true)} className="h-9 shrink-0">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva Institución
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {data.length} institución{data.length !== 1 ? "es" : ""} encontrada{data.length !== 1 ? "s" : ""}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-16 bg-card rounded-xl border border-border shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando instituciones…</span>
            </div>
          ) : (
            <DataTable data={data} columns={columns} searchable={false} />
          )}
        </main>

        <NuevoInstitucionModal open={modalNuevoOpen} onOpenChange={setModalNuevoOpen} onSuccess={loadInstituciones} />
        <EditarInstitucionModal
          open={modalEditarOpen}
          onOpenChange={setModalEditarOpen}
          institucion={institucionSeleccionada}
          onSuccess={loadInstituciones}
        />
        <EliminarInstitucionDialog
          open={dialogEliminarOpen}
          onOpenChange={setDialogEliminarOpen}
          institucion={institucionSeleccionada}
          onConfirm={confirmarEliminar}
        />
      </div>
    </ProtectedPage>
  );
}
