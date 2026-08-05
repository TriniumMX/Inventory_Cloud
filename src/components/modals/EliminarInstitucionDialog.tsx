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
import type { Institucion } from "@/lib/apiInstituciones";

interface EliminarInstitucionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institucion: Institucion | null;
  onConfirm: () => void;
}

export function EliminarInstitucionDialog({
  open,
  onOpenChange,
  institucion,
  onConfirm,
}: EliminarInstitucionDialogProps) {
  if (!institucion) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar institución?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar la institución:
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="font-medium">{institucion.nombre}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Estatus: {institucion.estatus === 1 ? "Activa" : "Inactiva"}
              </p>
            </div>
            <p className="mt-3 text-destructive font-medium">
              Esta acción no se puede deshacer. Si la institución tiene bienes en comodato asignados, verifica antes de eliminarla.
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
