import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, ClipboardList, Calendar, User, Wifi, Trash2 } from "lucide-react";
import { ProtectedPage } from "@/components/ProtectedPage";
import {
  getAllSessions,
  saveSession,
  clearSession,
  canCreateNewSession,
  getActiveSessionsFromSupabase,
  finalizeSessionInSupabase,
  type RevisionSession,
} from "@/lib/revisionStore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function Revisiones() {
  const navigate = useNavigate();
  const { user, canEdit: canEditModulo } = useAuth();
  const canEdit = canEditModulo("revisiones");
  const [sessions, setSessions] = useState<RevisionSession[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [restoredFromRemote, setRestoredFromRemote] = useState(false);

  useEffect(() => {
    const local = user ? getAllSessions(user.id) : getAllSessions();

    if (local.length > 0) {
      setSessions(local);
    }

    // Consultar Supabase para sesiones de otros dispositivos
    if (user) {
      setLoadingRemote(true);
      getActiveSessionsFromSupabase(user.id)
        .then((remote) => {
          if (remote.length > 0) {
            const localIds = new Set(local.map((s) => s.id));
            let merged = [...local];
            let restored = false;
            for (const rs of remote) {
              if (!localIds.has(rs.id)) {
                saveSession(rs);
                merged.push(rs);
                restored = true;
              }
            }
            if (restored) setRestoredFromRemote(true);
            setSessions(merged);
          }
        })
        .finally(() => setLoadingRemote(false));
    }
  }, [user]);

  const handleDeleteSession = async (session: RevisionSession) => {
    const confirm = window.confirm(
      `¿Eliminar la revisión de "${session.target.responsableNombre}"? Se perderá el progreso.`
    );
    if (!confirm) return;

    clearSession(session.id);
    await finalizeSessionInSupabase(session.id);
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    toast({ title: "Revisión eliminada" });
  };

  return (
    <ProtectedPage requiredModulo="revisiones">
      <div className="flex-1 flex flex-col">
        <Header breadcrumbs={[{ label: "Revisiones" }]} />

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {loadingRemote && sessions.length === 0 && (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  Verificando sesiones activas en otros dispositivos…
                </CardContent>
              </Card>
            )}

            {restoredFromRemote && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <Wifi className="h-3 w-3" /> Algunas sesiones fueron restauradas desde otro dispositivo
              </div>
            )}

            {/* Lista de sesiones activas */}
            {sessions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Sesiones en progreso ({sessions.length}/5)</h2>
                {sessions.map((s) => {
                  const progress = s.expected.length > 0
                    ? Math.round((s.scans.length / s.expected.length) * 100)
                    : 0;
                  return (
                    <Card key={s.id} className="border-primary/30">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {s.target.responsableTipo === "Empleado" ? (
                                <User className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                              )}
                              {s.target.responsableNombre}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {s.target.responsableTipo}
                              </Badge>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(s.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {s.scans.length} / {s.expected.length}
                          </Badge>
                        </div>

                        <Progress value={progress} className="h-2 mb-3" />

                        <div className="flex gap-2">
                          <Button
                            onClick={() => navigate(`/revisiones/${s.id}`)}
                            size="sm"
                            className="flex-1"
                          >
                            Continuar
                          </Button>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSession(s)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Nueva revisión */}
            {canEdit && (
              <Card>
                <CardHeader>
                  <CardTitle>Nueva Revisión</CardTitle>
                  <CardDescription>
                    Inicia una nueva sesión de revisión de resguardos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => navigate("/revisiones/nueva")}
                    size="lg"
                    className="w-full"
                    disabled={!canCreateNewSession(user?.id)}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Iniciar nueva revisión
                  </Button>
                  {!canCreateNewSession(user?.id) && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Has alcanzado el máximo de 5 revisiones simultáneas. Finaliza alguna para iniciar una nueva.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Info */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Por Empleado
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Revisa todos los artículos asignados a un empleado buscando por nómina.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Por Institución
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Revisa todos los artículos asignados a una institución (consigna).
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Hasta 5 simultáneas
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Puedes tener hasta 5 revisiones activas y reanudar cada una donde la dejaste.
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ProtectedPage>
  );
}
