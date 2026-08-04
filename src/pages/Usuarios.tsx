import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Shield, Eye, Plus, Edit, Trash2, Search, X, Loader2 } from "lucide-react";
import { listUsuarios, deleteUsuario } from "@/lib/apiUsers";
import { NuevoUsuarioModal } from "@/components/modals/NuevoUsuarioModal";
import { EditarUsuarioModal } from "@/components/modals/EditarUsuarioModal";
import { EliminarUsuarioDialog } from "@/components/modals/EliminarUsuarioDialog";
import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import type { Usuario } from "@/lib/types";

export default function Usuarios() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [data, setData] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [dialogEliminarOpen, setDialogEliminarOpen] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const response = await listUsuarios({ q: debouncedSearchTerm });
      setData(response.data.items);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, [debouncedSearchTerm]);

  const handleEditar = (usuario: Usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalEditarOpen(true);
  };

  const handleEliminar = (usuario: Usuario) => {
    if (currentUser?.id === usuario.id) {
      toast({ title: "Acción no permitida", description: "No puedes eliminar tu propio usuario", variant: "destructive" });
      return;
    }
    const superAdmins = data.filter((u) => u.permisos === 1);
    if (usuario.permisos === 1 && superAdmins.length === 1) {
      toast({ title: "Acción no permitida", description: "No puedes eliminar al único SuperAdmin del sistema", variant: "destructive" });
      return;
    }
    setUsuarioSeleccionado(usuario);
    setDialogEliminarOpen(true);
  };

  const confirmarEliminar = async () => {
    if (!usuarioSeleccionado) return;
    try {
      await deleteUsuario(usuarioSeleccionado.id);
      toast({ title: "Usuario eliminado", description: `Se eliminó al usuario ${usuarioSeleccionado.usuario}` });
      setDialogEliminarOpen(false);
      setUsuarioSeleccionado(null);
      loadUsuarios();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el usuario", variant: "destructive" });
    }
  };

  const getRoleName = (permisos: 1 | 2 | 3) => {
    switch (permisos) {
      case 1: return "Administrador";
      case 2: return "Editor";
      case 3: return "Consulta";
    }
  };

  const getRoleBadgeClass = (permisos: 1 | 2 | 3) => {
    switch (permisos) {
      case 1: return "bg-blue-100 text-blue-700 border-blue-200";
      case 2: return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case 3: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const columns = [
    {
      key: "nombre",
      label: "Usuario",
      render: (item: Usuario) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <span className="font-black text-xs">{item.nombre.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-slate-800 truncate">{item.nombre}</div>
            <div className="text-xs text-muted-foreground truncate">@{item.usuario}</div>
          </div>
        </div>
      ),
    },
    {
      key: "permisos",
      label: "Rol",
      render: (item: Usuario) => (
        <Badge
          variant="outline"
          className={`text-[11px] font-bold px-2 py-0.5 border ${getRoleBadgeClass(item.permisos)}`}
        >
          {getRoleName(item.permisos)}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (item: Usuario) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Ver detalles"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => toast({ title: "Próximamente", description: "Vista de detalles en desarrollo" })}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
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

  const superAdmins = data.filter((u) => u.permisos === 1);
  const editores = data.filter((u) => u.permisos === 2);

  return (
    <ProtectedPage requiredRole={1}>
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Usuarios" }]} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

          {/* Page title */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Usuarios</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Gestión de usuarios y permisos del sistema</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            <StatCard title="Total de Usuarios" value={data.length} icon={Users} description="Usuarios registrados" />
            <StatCard title="Administradores" value={superAdmins.length} icon={Shield} description="Acceso completo" accentColor="primary" />
            <StatCard title="Editores" value={editores.length} icon={Users} description="Permisos de edición" accentColor="emerald" />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nombre o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
                aria-label="Buscar usuarios"
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
              Nuevo Usuario
            </Button>
          </div>

          {/* Count */}
          <p className="text-xs text-muted-foreground">
            {data.length} usuario{data.length !== 1 ? "s" : ""} encontrado{data.length !== 1 ? "s" : ""}
          </p>

          {/* Table or loader */}
          {loading ? (
            <div className="flex items-center justify-center py-16 bg-card rounded-xl border border-border shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando usuarios…</span>
            </div>
          ) : (
            <DataTable data={data} columns={columns} searchable={false} />
          )}
        </main>

        <NuevoUsuarioModal open={modalNuevoOpen} onOpenChange={setModalNuevoOpen} onSuccess={loadUsuarios} />
        <EditarUsuarioModal open={modalEditarOpen} onOpenChange={setModalEditarOpen} usuario={usuarioSeleccionado} onSuccess={loadUsuarios} />
        <EliminarUsuarioDialog open={dialogEliminarOpen} onOpenChange={setDialogEliminarOpen} usuario={usuarioSeleccionado} onConfirm={confirmarEliminar} />
      </div>
    </ProtectedPage>
  );
}
