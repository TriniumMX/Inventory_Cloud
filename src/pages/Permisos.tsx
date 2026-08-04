import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProtectedPage } from "@/components/ProtectedPage";
import { GestionarPermisosModal } from "@/components/modals/GestionarPermisosModal";
import { Shield, Users, KeyRound, Loader2 } from "lucide-react";
import { listUsuarios } from "@/lib/apiUsers";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Usuario } from "@/lib/types";

const PERMISOS_CONFIG: Record<number, { label: string; className: string }> = {
  1: { label: "SuperAdmin", className: "bg-purple-100 text-purple-800" },
  2: { label: "Editor",     className: "bg-blue-100 text-blue-800" },
  3: { label: "Consulta",   className: "bg-gray-100 text-gray-700" },
};

export default function Permisos() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const res = await listUsuarios({});
      setUsuarios(res.data.items);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los usuarios", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsuarios(); }, []);

  const handleGestionar = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setModalOpen(true);
  };

  const columns = [
    {
      key: "nombre",
      label: "Nombre",
      render: (item: Usuario) => (
        <div>
          <p className="font-medium">{item.nombre}</p>
          <p className="text-xs text-muted-foreground font-mono">{item.usuario}</p>
        </div>
      ),
    },
    {
      key: "permisos",
      label: "Rol",
      render: (item: Usuario) => {
        const cfg = PERMISOS_CONFIG[item.permisos];
        return (
          <Badge className={`text-xs border-0 ${cfg?.className ?? ""}`}>
            {cfg?.label ?? "—"}
          </Badge>
        );
      },
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (item: Usuario) => {
        const isSuperAdmin = item.permisos === 1;
        const isMe = currentUser?.id === item.id;
        return (
          <div className="flex items-center gap-2">
            {isSuperAdmin ? (
              <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                <Shield className="h-3 w-3" />
                Acceso total
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8"
                onClick={() => handleGestionar(item)}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Gestionar Permisos
                {isMe && (
                  <Badge className="ml-1 text-[10px] bg-blue-100 text-blue-700 border-0 h-4 px-1">
                    Tú
                  </Badge>
                )}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const totalNoSuperAdmin = usuarios.filter((u) => u.permisos !== 1).length;

  return (
    <ProtectedPage requiredRole={1}>
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Permisos" }]} />

        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Permisos</h1>
            <p className="text-muted-foreground">
              Asigna acceso por módulo a cada usuario del sistema.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              title="Total Usuarios"
              value={usuarios.length}
              icon={Users}
              description="Usuarios registrados"
            />
            <StatCard
              title="Con Permisos Configurables"
              value={totalNoSuperAdmin}
              icon={KeyRound}
              description="Usuarios no SuperAdmin"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 bg-card rounded-lg border">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando usuarios...</span>
            </div>
          ) : (
            <DataTable
              data={usuarios}
              columns={columns}
              searchPlaceholder="Buscar por nombre o usuario..."
            />
          )}
        </main>
      </div>

      {selectedUsuario && (
        <GestionarPermisosModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          userId={selectedUsuario.id}
          userName={selectedUsuario.nombre}
          onSuccess={loadUsuarios}
        />
      )}
    </ProtectedPage>
  );
}
