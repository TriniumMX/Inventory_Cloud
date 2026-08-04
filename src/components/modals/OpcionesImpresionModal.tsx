import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label as FormLabel } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label50x25 } from "@/components/labels/Label50x25";
import {
  getLabelPreferences,
  saveLabelPreferences,
  type LabelPreferences,
} from "@/lib/labelUtils";

interface OpcionesImpresionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedInventoryCodes: string[];
  onConfirm: (prefs: LabelPreferences) => void;
}

export function OpcionesImpresionModal({
  open,
  onOpenChange,
  selectedInventoryCodes,
  onConfirm,
}: OpcionesImpresionModalProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [preferences, setPreferences] = useState<LabelPreferences>(
    getLabelPreferences()
  );

  const orgName = import.meta.env.VITE_ORG_NAME || "INVENTORY CLOUD";
  const logoUrl = import.meta.env.VITE_LABEL_LOGO_URL || "/logo.png";
  const labelUrlBase = import.meta.env.VITE_LABEL_URL_BASE || window.location.origin;
  const isDemo = !import.meta.env.VITE_LABEL_URL_BASE || labelUrlBase.includes("localhost");

  // Cargar preferencias al abrir
  useEffect(() => {
    if (open) {
      setPreferences(getLabelPreferences());
      // Focus en el título
      setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Manejar atajos de teclado
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, preferences]);

  const handleConfirm = () => {
    saveLabelPreferences(preferences);
    onConfirm(preferences);
    onOpenChange(false);
  };

  const totalLabels = selectedInventoryCodes.length * preferences.copies;
  const previewCode = selectedInventoryCodes[0] || "DEMO-001";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle ref={titleRef} tabIndex={-1}>
            Opciones de Impresión
          </DialogTitle>
          <DialogDescription>
            Configura las opciones para imprimir {selectedInventoryCodes.length} etiqueta
            {selectedInventoryCodes.length !== 1 ? "s" : ""} (
            {totalLabels} total con {preferences.copies} copia{preferences.copies !== 1 ? "s" : ""})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* DPI Selection */}
          <div className="space-y-3">
            <FormLabel className="text-base font-semibold">Resolución (DPI)</FormLabel>
            <RadioGroup
              value={preferences.dpi.toString()}
              onValueChange={(value) =>
                setPreferences({ ...preferences, dpi: parseInt(value) as 203 | 300 })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="203" id="dpi-203" />
                <FormLabel htmlFor="dpi-203" className="font-normal cursor-pointer">
                  203 DPI (Impresora térmica estándar)
                </FormLabel>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="300" id="dpi-300" />
                <FormLabel htmlFor="dpi-300" className="font-normal cursor-pointer">
                  300 DPI (Alta resolución)
                </FormLabel>
              </div>
            </RadioGroup>
          </div>

          {/* QR Code */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <FormLabel htmlFor="show-qr" className="text-base font-semibold">
                Incluir código QR
              </FormLabel>
              <p className="text-sm text-muted-foreground">
                Muestra el código QR para verificación digital
              </p>
            </div>
            <Switch
              id="show-qr"
              checked={preferences.showQr}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, showQr: checked })
              }
            />
          </div>

          {/* Barcode Text */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <FormLabel htmlFor="show-text" className="text-base font-semibold">
                Mostrar texto del código de barras
              </FormLabel>
              <p className="text-sm text-muted-foreground">
                Muestra el número de inventario debajo del código de barras
              </p>
            </div>
            <Switch
              id="show-text"
              checked={preferences.showBarcodeText}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, showBarcodeText: checked })
              }
            />
          </div>

          {/* Copies */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <FormLabel htmlFor="copies" className="text-base font-semibold">
                Copias por etiqueta
              </FormLabel>
              <p className="text-sm text-muted-foreground">
                Número de copias de cada etiqueta (1-10)
              </p>
            </div>
            <Input
              id="copies"
              type="number"
              min={1}
              max={10}
              value={preferences.copies}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  copies: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                })
              }
              className="w-32"
            />
          </div>

          {/* Preview */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <FormLabel className="text-base font-semibold">Previsualización</FormLabel>
              {isDemo && <Badge variant="secondary">Modo Demo</Badge>}
            </div>
            <div className="flex justify-center bg-muted/30 p-4 rounded-lg">
              <div
                style={{
                  transform: "scale(1.5)",
                  transformOrigin: "center",
                }}
              >
                <Label50x25
                  inventoryCode={previewCode}
                  orgName={orgName}
                  logoUrl={logoUrl}
                  dpi={preferences.dpi}
                  showQr={preferences.showQr}
                  showBarcodeText={preferences.showBarcodeText}
                  isDemo={isDemo}
                />
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Ejemplo con el código: {previewCode}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Continuar a Impresión ({totalLabels} etiquetas)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
