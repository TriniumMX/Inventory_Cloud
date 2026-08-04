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
import { Activo } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

interface ConfirmarBajaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activo: Activo | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmarBajaDialog({
  open,
  onOpenChange,
  activo,
  onConfirm,
  isLoading = false,
}: ConfirmarBajaDialogProps) {
  if (!activo) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <AlertDialogTitle>¿Dar de baja este activo?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 space-y-3">
            <p>
              Esta acción marcará el activo como dado de baja y <strong>ya no podrá ser editado posteriormente</strong>.
            </p>
            <div className="bg-muted p-3 rounded-md space-y-1">
              <p className="font-medium text-foreground">{activo.numeroInventario}</p>
              <p className="text-sm">{activo.descripcion}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
          >
            {isLoading ? "Procesando..." : "Confirmar Baja"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
