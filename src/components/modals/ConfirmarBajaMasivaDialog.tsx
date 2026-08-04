import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface ConfirmarBajaMasivaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cantidad: number;
  valorTotal: number;
  onConfirm: (observaciones?: string) => void;
  isLoading?: boolean;
}

export function ConfirmarBajaMasivaDialog({
  open,
  onOpenChange,
  cantidad,
  valorTotal,
  onConfirm,
  isLoading,
}: ConfirmarBajaMasivaDialogProps) {
  const [observaciones, setObservaciones] = useState("");

  const handleConfirm = () => {
    onConfirm(observaciones || undefined);
    setObservaciones("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Baja Definitiva
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Estás a punto de dar de <strong>baja definitiva</strong> a{" "}
                <strong>{cantidad}</strong> bien(es) con un valor total de{" "}
                <strong>
                  {new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  }).format(valorTotal)}
                </strong>.
              </p>
              <p className="text-destructive font-medium">
                Esta acción es irreversible. Los bienes pasarán a estatus BAJA
                y no podrán ser reactivados.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Motivo / Observaciones (opcional)
                </label>
                <Textarea
                  placeholder="Motivo de la baja definitiva..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Procesando..." : "Confirmar Baja Definitiva"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
