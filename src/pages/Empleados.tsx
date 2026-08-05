import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, UserCheck, UserX, Plus, Edit, Trash2, Search, X, Loader2 } from "lucide-react";
import { listEmpleados, deleteEmpleado } from "@/lib/employees";
import { NuevoEmpleadoModal } from "@/components/modals/NuevoEmpleadoModal";
import { EditarEmpleadoModal } from "@/components/modals/EditarEmpleadoModal";
import { EliminarEmpleadoDialog } from "@/components/modals/EliminarEmpleadoDialog";
import { ProtectedPage } from "@/components/ProtectedPage";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import type { Empleado } from "@/lib/types";

export default function Empleados() {
  const { toast } = useToast();
  const [data, setData] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [dialogEliminarOpen, setDialogEliminarOpen] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null);

  const loadEmpleados = async () => {
    setLoading(true);
    try {
      const response = await listEmpleados({ q: debouncedSearchTerm });
      setData(response.items);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmpleados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const handleEditar = (empleado: Empleado) => {
    setEmpleadoSeleccionado(empleado);
    setModalEditarOpen(true);
  };

  const handleEliminar = (empleado: Empleado) => {
    setEmpleadoSeleccionado(empleado);
    setDialogEliminarOpen(true);
  };

  const confirmarEliminar = async () => {
    if (!empleadoSeleccionado) return;
    try {
      await deleteEmpleado(empleadoSeleccionado.nomina);
      toast({ title: "Empleado eliminado", description: `Se eliminó a ${empleadoSeleccionado.nombre}` });
      setDialogEliminarOpen(false);
      setEmpleadoSeleccionado(null);
      loadEmpleados();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el empleado",
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      key: "nombre",
      label: "Empleado",
      render: (item: Empleado) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <span className="font-black text-xs">{item.nombre.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-slate-800 truncate">{item.nombre}</div>
            <div className="text-xs text-muted-foreground truncate">Nómina: {item.nomina}</div>
          </div>
        </div>
      ),
    },
    {
      key: "departamento",
      label: "Departamento",
      mobileHide: true,
      render: (item: Empleado) => item.departamento || "—",
    },
    {
      key: "puesto",
      label: "Puesto",
      mobileHide: true,
      render: (item: Empleado) => item.puesto || "—",
    },
    {
      key: "activo",
      label: "Estatus",
      render: (item: Empleado) => (
        <Badge
          variant="outline"
          className={`text-[11px] font-bold px-2 py-0.5 border ${
            item.activo === "B"
              ? "bg-rose-100 text-rose-700 border-rose-200"
              : "bg-emerald-100 text-emerald-700 border-emerald-200"
          }`}
        >
          {item.activo === "B" ? "Baja" : "Activo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (item: Empleado) => (
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

  const activos = data.filter((e) => e.activo !== "B");
  const bajas = data.filter((e) => e.activo === "B");

  return (
    <ProtectedPage requiredRole={1}>
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Empleados" }]} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Empleados</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Catálogo de empleados usado en resguardos y traspasos
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            <StatCard title="Total de Empleados" value={data.length} icon={Users} description="Empleados registrados" />
            <StatCard title="Activos" value={activos.length} icon={UserCheck} description="Empleados en servicio" accentColor="emerald" />
            <StatCard title="Baja" value={bajas.length} icon={UserX} description="Empleados dados de baja" accentColor="amber" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nómina, nombre, departamento o puesto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
                aria-label="Buscar empleados"
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
              Nuevo Empleado
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {data.length} empleado{data.length !== 1 ? "s" : ""} encontrado{data.length !== 1 ? "s" : ""}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-16 bg-card rounded-xl border border-border shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando empleados…</span>
            </div>
          ) : (
            <DataTable data={data} columns={columns} searchable={false} />
          )}
        </main>

        <NuevoEmpleadoModal open={modalNuevoOpen} onOpenChange={setModalNuevoOpen} onSuccess={loadEmpleados} />
        <EditarEmpleadoModal
          open={modalEditarOpen}
          onOpenChange={setModalEditarOpen}
          empleado={empleadoSeleccionado}
          onSuccess={loadEmpleados}
        />
        <EliminarEmpleadoDialog
          open={dialogEliminarOpen}
          onOpenChange={setDialogEliminarOpen}
          empleado={empleadoSeleccionado}
          onConfirm={confirmarEliminar}
        />
      </div>
    </ProtectedPage>
  );
}
