import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import { Activo } from "@/lib/types";
import { updateActivo } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface CambiarEstatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activo: Activo | null;
  onSuccess: () => void;
}

const ESTATUSES = [
  { value: "ACTIVO", label: "Activo", className: "bg-secondary/10 text-secondary" },
  { value: "ALMACEN", label: "En Almacen", className: "bg-yellow-100 text-yellow-800" },
  { value: "PRE-BAJA", label: "Pre-Baja", className: "bg-orange-100 text-orange-800" },
  { value: "BAJA", label: "Baja", className: "bg-red-100 text-red-800" },
];

function estatusBadgeClass(estatus: string) {
  return ESTATUSES.find((e) => e.value === estatus)?.className ?? "";
}

export function CambiarEstatusModal({ open, onOpenChange, activo, onSuccess }: CambiarEstatusModalProps) {
  const { toast } = useToast();
  const [newEstatus, setNewEstatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setNewEstatus(activo?.estatus ?? "");
    onOpenChange(isOpen);
  };

  const handleConfirm = async () => {
    if (!activo || !newEstatus || newEstatus === activo.estatus) return;
    setLoading(true);
    try {
      await updateActivo(activo.id, { estatus: newEstatus });
      toast({ title: "Estatus actualizado", description: `${activo.numeroInventario} cambió a ${newEstatus}` });
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: "Error", description: "No se pudo cambiar el estatus", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!activo) return null;

  const isBaja = newEstatus === "BAJA";
  const hasChange = newEstatus && newEstatus !== activo.estatus;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar Estatus</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">{activo.numeroInventario}</p>
            <p className="text-sm text-muted-foreground truncate">{activo.descripcion}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Actual:</span>
            <Badge className={`${estatusBadgeClass(activo.estatus)} border-0`}>
              {ESTATUSES.find((e) => e.value === activo.estatus)?.label ?? activo.estatus}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nuevo estatus
            </Label>
            <Select value={newEstatus} onValueChange={setNewEstatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un estatus" />
              </SelectTrigger>
              <SelectContent>
                {ESTATUSES.filter((e) => e.value !== activo.estatus).map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isBaja && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Dar de baja un bien es una acción permanente. El bien quedará inactivo en el inventario.
              </AlertDescription>
            </Alert>
          )}

          <Alert className="py-2 border-blue-200 bg-blue-50 text-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-700">
              Este cambio quedará registrado en la bitácora del sistema con tu usuario, fecha y hora.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasChange || loading}
            variant={isBaja ? "destructive" : "default"}
          >
            {loading ? "Guardando..." : "Confirmar cambio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
