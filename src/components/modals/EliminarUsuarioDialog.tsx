import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Usuario } from "@/lib/types";

interface EliminarUsuarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
  onConfirm: () => void;
}

export function EliminarUsuarioDialog({
  open,
  onOpenChange,
  usuario,
  onConfirm,
}: EliminarUsuarioDialogProps) {
  if (!usuario) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar al usuario:
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="font-medium">{usuario.nombre}</p>
              <p className="text-sm text-muted-foreground">@{usuario.usuario}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Rol: {usuario.permisos === 1 ? "Administrador" : usuario.permisos === 2 ? "Editor" : "Consulta"}
              </p>
            </div>
            <p className="mt-3 text-destructive font-medium">
              Esta acción no se puede deshacer.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
