import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, UserPlus, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createUsuario } from "@/lib/apiUsers";
import { listModulos, updateUsuarioModulos } from "@/lib/apiPermisos";
import { usuarioCreateSchema, type UsuarioCreateDto } from "@/lib/schemasUsuarios";
import type { ModuloCatalog, UsuarioModuloAsignacion } from "@/lib/types";

interface NuevoUsuarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type AsignacionMap = Record<string, { puedeVer: boolean; puedeEditar: boolean }>;

const GRUPO_ORDEN = ["INVENTARIO", "GESTIÓN", "SISTEMA"];

export function NuevoUsuarioModal({ open, onOpenChange, onSuccess }: NuevoUsuarioModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [modulos, setModulos] = useState<ModuloCatalog[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionMap>({});
  const [loadingModulos, setLoadingModulos] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, reset } = useForm<UsuarioCreateDto>({
    resolver: zodResolver(usuarioCreateSchema),
    defaultValues: { permisos: 3 },
  });

  const permisos = watch("permisos");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setAsignaciones({});
      reset();
    }
  }, [open]);

  // Load modules when reaching step 2
  const handleNextStep = handleSubmit(async () => {
    if (modulos.length === 0) {
      setLoadingModulos(true);
      try {
        const cats = await listModulos();
        setModulos(cats);
      } catch {
        toast({ title: "Error", description: "No se pudieron cargar los módulos", variant: "destructive" });
        return;
      } finally {
        setLoadingModulos(false);
      }
    }
    setStep(2);
  });

  const handleCrear = async (formData: UsuarioCreateDto) => {
    setGuardando(true);
    let newUserId: number | null = null;
    try {
      const res = await createUsuario(formData);
      newUserId = res.data?.id ?? res.data?.id_usuario ?? null;

      // Assign module permissions (only for non-SuperAdmin)
      if (newUserId && formData.permisos !== 1) {
        const payload: UsuarioModuloAsignacion[] = modulos.map((m) => ({
          clave: m.clave,
          puedeVer: asignaciones[m.clave]?.puedeVer ?? false,
          puedeEditar: asignaciones[m.clave]?.puedeEditar ?? false,
        }));
        try {
          await updateUsuarioModulos(newUserId, payload);
        } catch {
          toast({
            title: "Usuario creado",
            description: "El usuario fue creado pero no se pudieron guardar los permisos. Edítalos desde la página de Permisos.",
            variant: "default",
          });
          onOpenChange(false);
          onSuccess();
          return;
        }
      }

      toast({ title: "Usuario creado", description: `Se creó el usuario ${formData.usuario} exitosamente` });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el usuario",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  const getAsig = (clave: string) => asignaciones[clave] ?? { puedeVer: false, puedeEditar: false };

  const setVer = (clave: string, val: boolean) =>
    setAsignaciones((prev) => ({
      ...prev,
      [clave]: { puedeVer: val, puedeEditar: val ? prev[clave]?.puedeEditar ?? false : false },
    }));

  const setEditar = (clave: string, val: boolean) =>
    setAsignaciones((prev) => ({ ...prev, [clave]: { ...getAsig(clave), puedeEditar: val } }));

  const modulosPorGrupo = GRUPO_ORDEN.reduce<Record<string, ModuloCatalog[]>>((acc, g) => {
    acc[g] = modulos.filter((m) => m.grupo === g).sort((a, b) => a.orden - b.orden);
    return acc;
  }, {});

  const isSuperAdmin = permisos === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nuevo Usuario
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Paso 1 de 2 — Datos del usuario"
              : "Paso 2 de 2 — Asignar módulos de acceso"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 pb-1">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        {/* ── STEP 1: User data ─────────────────────────────────────── */}
        {step === 1 && (
          <form id="form-paso1" onSubmit={handleNextStep} className="space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo *</Label>
              <Input id="nombre" placeholder="Ej: Juan Pérez" {...register("nombre")} />
              {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuario">Usuario *</Label>
              <Input id="usuario" placeholder="Ej: jperez" {...register("usuario")} />
              {errors.usuario && <p className="text-sm text-destructive">{errors.usuario.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Nivel de Permisos *</Label>
              <Select
                value={permisos?.toString()}
                onValueChange={(val) => setValue("permisos", parseInt(val) as 1 | 2 | 3)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona permisos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - SuperAdmin</SelectItem>
                  <SelectItem value="2">2 - Editor</SelectItem>
                  <SelectItem value="3">3 - Consulta</SelectItem>
                </SelectContent>
              </Select>
              {errors.permisos && <p className="text-sm text-destructive">{errors.permisos.message}</p>}
            </div>
          </form>
        )}

        {/* ── STEP 2: Módulos ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {isSuperAdmin ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <div className="rounded-full bg-purple-100 p-4">
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
                <p className="font-semibold">SuperAdmin — Acceso Total</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Los SuperAdmins tienen acceso automático a todos los módulos del sistema. No es necesario asignar permisos individuales.
                </p>
              </div>
            ) : loadingModulos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {GRUPO_ORDEN.map((grupo) => {
                  const items = modulosPorGrupo[grupo] ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={grupo}>
                      <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-2">
                        {grupo}
                      </p>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-[1fr_70px_70px] bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                          <span>Módulo</span>
                          <span className="text-center">Ver</span>
                          <span className="text-center">Editar</span>
                        </div>
                        {items.map((m, idx) => {
                          const asig = getAsig(m.clave);
                          return (
                            <div
                              key={m.clave}
                              className={`grid grid-cols-[1fr_70px_70px] items-center px-3 py-2.5 text-sm ${idx < items.length - 1 ? "border-b" : ""}`}
                            >
                              <Label className="font-normal cursor-pointer text-sm">{m.nombre}</Label>
                              <div className="flex justify-center">
                                <Checkbox checked={asig.puedeVer} onCheckedChange={(v) => setVer(m.clave, !!v)} />
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

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {Object.values(asignaciones).filter((a) => a.puedeVer).length} módulos con acceso
                  </Badge>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="pt-3 border-t flex-row gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button form="form-paso1" type="submit" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={guardando} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
              <Button
                onClick={handleSubmit(handleCrear)}
                disabled={guardando}
                className="gap-1.5"
              >
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Crear Usuario
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
