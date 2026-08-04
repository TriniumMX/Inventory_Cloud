import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Info, Shield } from "lucide-react";
import { listModulos, getUsuarioModulos, updateUsuarioModulos } from "@/lib/apiPermisos";
import type { ModuloCatalog, UsuarioModuloAsignacion } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface GestionarPermisosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName: string;
  onSuccess: () => void;
}

type AsignacionMap = Record<string, { puedeVer: boolean; puedeEditar: boolean }>;

const GRUPO_ORDEN = ["INVENTARIO", "GESTIÓN", "SISTEMA"];

export function GestionarPermisosModal({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
}: GestionarPermisosModalProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [modulos, setModulos] = useState<ModuloCatalog[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionMap>({});
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const isCurrentUser = currentUser?.id === userId;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([listModulos(), getUsuarioModulos(userId)])
      .then(([cats, asigs]: [ModuloCatalog[], UsuarioModuloAsignacion[]]) => {
        setModulos(cats);
        const map: AsignacionMap = {};
        for (const a of asigs) {
          map[a.clave] = { puedeVer: a.puedeVer, puedeEditar: a.puedeEditar };
        }
        setAsignaciones(map);
      })
      .catch(() => {
        toast({ title: "Error", description: "No se pudieron cargar los permisos", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [open, userId]);

  const getAsig = (clave: string) =>
    asignaciones[clave] ?? { puedeVer: false, puedeEditar: false };

  const setVer = (clave: string, val: boolean) => {
    setAsignaciones((prev) => ({
      ...prev,
      [clave]: { puedeVer: val, puedeEditar: val ? prev[clave]?.puedeEditar ?? false : false },
    }));
  };

  const setEditar = (clave: string, val: boolean) => {
    setAsignaciones((prev) => ({
      ...prev,
      [clave]: { ...prev[clave], puedeEditar: val },
    }));
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const payload: UsuarioModuloAsignacion[] = modulos.map((m) => ({
        clave: m.clave,
        puedeVer: getAsig(m.clave).puedeVer,
        puedeEditar: getAsig(m.clave).puedeEditar,
      }));
      await updateUsuarioModulos(userId, payload);
      toast({ title: "Permisos guardados", description: `Permisos de ${userName} actualizados correctamente` });
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: "Error", description: "No se pudieron guardar los permisos", variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  // Agrupar módulos por grupo
  const modulosPorGrupo = GRUPO_ORDEN.reduce<Record<string, ModuloCatalog[]>>((acc, g) => {
    acc[g] = modulos.filter((m) => m.grupo === g).sort((a, b) => a.orden - b.orden);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Gestionar Permisos
          </DialogTitle>
          <DialogDescription>
            Asigna acceso por módulo a <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isCurrentUser && (
          <Alert className="py-2 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-700">
              Estás editando tu propio usuario. Deberás volver a iniciar sesión para que los cambios surtan efecto.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Cargando permisos...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-1">
            {GRUPO_ORDEN.map((grupo) => {
              const items = modulosPorGrupo[grupo] ?? [];
              if (items.length === 0) return null;
              return (
                <div key={grupo}>
                  <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-2 px-1">
                    {grupo}
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_80px_80px] bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                      <span>Módulo</span>
                      <span className="text-center">Ver</span>
                      <span className="text-center">Editar</span>
                    </div>
                    {/* Rows */}
                    {items.map((m, idx) => {
                      const asig = getAsig(m.clave);
                      return (
                        <div
                          key={m.clave}
                          className={`grid grid-cols-[1fr_80px_80px] items-center px-3 py-2.5 text-sm ${
                            idx < items.length - 1 ? "border-b" : ""
                          } ${asig.puedeVer ? "bg-primary/3" : ""}`}
                        >
                          <Label className="font-normal cursor-pointer">{m.nombre}</Label>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={asig.puedeVer}
                              onCheckedChange={(v) => setVer(m.clave, !!v)}
                            />
                          </div>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={asig.puedeEditar}
                              disabled={!asig.puedeVer}
                              onCheckedChange={(v) => setEditar(m.clave, !!v)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <Badge variant="secondary" className="text-xs">
                {Object.values(asignaciones).filter((a) => a.puedeVer).length} módulos con acceso
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {Object.values(asignaciones).filter((a) => a.puedeEditar).length} con edición
              </Badge>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={loading || guardando}>
            {guardando ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
