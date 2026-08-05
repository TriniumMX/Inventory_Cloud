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
import type { Empleado } from "@/lib/types";

interface EliminarEmpleadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleado: Empleado | null;
  onConfirm: () => void;
}

export function EliminarEmpleadoDialog({
  open,
  onOpenChange,
  empleado,
  onConfirm,
}: EliminarEmpleadoDialogProps) {
  if (!empleado) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar al empleado:
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="font-medium">{empleado.nombre}</p>
              <p className="text-sm text-muted-foreground">Nómina: {empleado.nomina}</p>
              {(empleado.departamento || empleado.puesto) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {[empleado.departamento, empleado.puesto].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <p className="mt-3 text-destructive font-medium">
              Esta acción no se puede deshacer. Si el empleado tiene bienes o resguardos asignados, verifica antes de eliminarlo.
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
