import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { updateUsuario } from "@/lib/apiUsers";
import { usuarioUpdateSchema, type UsuarioUpdateDto } from "@/lib/schemasUsuarios";
import type { Usuario } from "@/lib/types";

interface EditarUsuarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
  onSuccess: () => void;
}

export function EditarUsuarioModal({ open, onOpenChange, usuario, onSuccess }: EditarUsuarioModalProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, reset } = useForm<UsuarioUpdateDto>({
    resolver: zodResolver(usuarioUpdateSchema),
  });

  const permisos = watch("permisos");
  const password = watch("password");

  const isEditingSelf = currentUser?.id === usuario?.id;

  useEffect(() => {
    if (usuario) {
      setValue("id", usuario.id);
      setValue("nombre", usuario.nombre);
      setValue("usuario", usuario.usuario);
      setValue("password", "");
      setValue("permisos", usuario.permisos);
    }
  }, [usuario, setValue]);

  const onSubmit = async (data: UsuarioUpdateDto) => {
    if (!usuario) return;

    try {
      // Si password está vacío, no enviarlo
      const payload = { ...data };
      if (!payload.password || payload.password === "") {
        delete payload.password;
      }

      await updateUsuario(usuario.id, payload);
      
      let description = `Se actualizó el usuario ${data.usuario} exitosamente`;
      
      if (isEditingSelf) {
        description += ". Vuelva a iniciar sesión para aplicar los cambios.";
      }

      toast({
        title: "Usuario actualizado",
        description,
      });

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifica los datos del usuario
          </DialogDescription>
        </DialogHeader>

        {isEditingSelf && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Estás editando tu propio usuario. Los cambios en permisos requerirán reiniciar sesión.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="id">ID</Label>
            <Input
              id="id"
              type="number"
              disabled
              {...register("id", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre Completo *</Label>
            <Input
              id="nombre"
              placeholder="Ej: Juan Pérez"
              {...register("nombre")}
            />
            {errors.nombre && (
              <p className="text-sm text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="usuario">Usuario *</Label>
            <Input
              id="usuario"
              placeholder="Ej: jperez"
              {...register("usuario")}
            />
            {errors.usuario && (
              <p className="text-sm text-destructive">{errors.usuario.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Dejar vacío para no cambiar"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Dejar vacío para no cambiar la contraseña.
            </p>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="permisos">Nivel de Permisos *</Label>
            <Select
              value={permisos?.toString()}
              onValueChange={(val) => setValue("permisos", parseInt(val) as 1 | 2 | 3)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona permisos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Administrador</SelectItem>
                <SelectItem value="2">2 - Editor</SelectItem>
                <SelectItem value="3">3 - Consulta</SelectItem>
              </SelectContent>
            </Select>
            {errors.permisos && (
              <p className="text-sm text-destructive">{errors.permisos.message}</p>
            )}
          </div>


          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Actualizando..." : "Actualizar Usuario"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
