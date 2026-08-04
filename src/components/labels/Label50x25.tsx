import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mmToPx } from "@/lib/labelUtils";

// Plantilla base con heráldica pre-incluida
import plantillaBase from "@/assets/plantilla-etiqueta.jpg";

interface Label50x25Props {
  inventoryCode: string;
  orgName: string;
  logoUrl?: string;
  descripcion?: string;
  numeroSerie?: string;
  dpi?: 203 | 300;
  showQr?: boolean;
  showBarcodeText?: boolean;
  isDemo?: boolean;
  printMode?: boolean; // Solo renderiza el canvas sin UI
}

export function Label50x25({
  inventoryCode,
  orgName,
  logoUrl,
  descripcion,
  numeroSerie,
  dpi = 203,
  showQr = true,
  showBarcodeText = true,
  isDemo = false,
  printMode = false,
}: Label50x25Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate canvas size based on DPI
  const width = mmToPx(50, dpi);
  const height = mmToPx(25, dpi);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Fill white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    const renderLabel = async () => {
      try {
        // === 1. CARGAR Y DIBUJAR PLANTILLA BASE ===
        const plantilla = new Image();
        await new Promise<void>((resolve, reject) => {
          plantilla.onload = () => resolve();
          plantilla.onerror = (e) => reject(e);
          plantilla.src = plantillaBase;
        });
        
        // Dibujar plantilla ocupando todo el canvas
        ctx.drawImage(plantilla, 0, 0, width, height);

        // === LAYOUT PARA LADO DERECHO ===
        const rightStartX = Math.round(width * 0.48);
        const rightWidth = width - rightStartX;
        const padding = Math.round(width * 0.02);

        // === 2. NÚMERO DE INVENTARIO (arriba, centrado en lado derecho) ===
        ctx.fillStyle = "#000000";
        ctx.font = `bold ${Math.round(height * 0.14)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const textY = Math.round(height * 0.06);
        ctx.fillText(inventoryCode, rightStartX + rightWidth / 2, textY);

        // === 3. QR CODE (grande, debajo del texto) ===
        if (showQr) {
          try {
            const qrContent = [
              inventoryCode,
              descripcion || '',
              numeroSerie ? `N/S: ${numeroSerie}` : '',
            ].filter(Boolean).join('\n');

            // Calcular espacio disponible para QR
            const textHeight = Math.round(height * 0.22);
            const availableHeight = height - textHeight - padding;
            const qrSize = Math.round(Math.min(availableHeight * 0.95, rightWidth * 0.85));
            
            const qrDataUrl = await QRCode.toDataURL(qrContent, {
              width: qrSize,
              margin: 0,
              errorCorrectionLevel: 'M',
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
            });

            const qrImage = new Image();
            await new Promise((resolve, reject) => {
              qrImage.onload = resolve;
              qrImage.onerror = reject;
              qrImage.src = qrDataUrl;
            });

            // Centrar QR en el lado derecho, debajo del texto
            const qrX = rightStartX + (rightWidth - qrSize) / 2;
            const qrY = textHeight + (availableHeight - qrSize) / 2;

            ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
          } catch (error) {
            console.warn("Failed to generate QR:", error);
          }
        }

        setIsRendered(true);
      } catch (error) {
        console.error("Error rendering label:", error);
      }
    };

    renderLabel();

    // Focus on print button when rendered (only in non-print mode)
    if (buttonRef.current && !printMode) {
      buttonRef.current.focus();
    }
  }, [inventoryCode, orgName, logoUrl, descripcion, numeroSerie, dpi, showQr, showBarcodeText, width, height, printMode]);

  // Handle keyboard shortcuts (only in non-print mode)
  useEffect(() => {
    if (printMode) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        handlePrint();
      } else if (e.key === "Escape") {
        window.close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [printMode]);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  // Modo impresión: solo el canvas sin UI
  if (printMode) {
    return (
      <canvas
        ref={canvasRef}
        style={{
          width: "50mm",
          height: "25mm",
          display: "block",
        }}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 gap-4">
      {isDemo && (
        <Badge variant="secondary" className="mb-2">
          Modo Demo
        </Badge>
      )}
      
      <div className="label-container" style={{ pageBreakAfter: "always" }}>
        <canvas
          ref={canvasRef}
          className="border border-border"
          style={{
            width: "50mm",
            height: "25mm",
          }}
        />
      </div>

      <div className="flex gap-2 print:hidden">
        <Button
          ref={buttonRef}
          onClick={handlePrint}
          disabled={!isRendered}
        >
          Imprimir
        </Button>
        <Button variant="outline" onClick={handleClose}>
          Cerrar
        </Button>
      </div>

      <style>{`
        @media print {
          @page {
            size: 50mm 25mm;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .label-container {
            width: 50mm;
            height: 25mm;
            margin: 0;
            padding: 0;
            page-break-after: always;
          }

          canvas {
            width: 50mm !important;
            height: 25mm !important;
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
