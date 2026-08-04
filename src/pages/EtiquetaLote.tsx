import { useSearchParams } from "react-router-dom";
import { Label50x25 } from "@/components/labels/Label50x25";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { listActivos } from "@/lib/api";
import { Activo } from "@/lib/types";
import heraldica from "@/assets/heraldica-sjr.png";

interface LabelData {
  id: string;
  code: string;
  copyNum: number;
  descripcion?: string;
  numeroSerie?: string;
}

const EtiquetaLote = () => {
  const [searchParams] = useSearchParams();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();
  const [isRendering, setIsRendering] = useState(true);
  const [allLabels, setAllLabels] = useState<LabelData[]>([]);
  
  const idsParam = searchParams.get("ids") || "";
  const inventoryCodes = idsParam.split(",").filter(Boolean);
  
  // Parse options from query params
  const dpi = parseInt(searchParams.get("dpi") || "203") as 203 | 300;
  const showQr = searchParams.get("qr") !== "0";
  const showBarcodeText = searchParams.get("txt") !== "0";
  const copies = Math.max(1, Math.min(10, parseInt(searchParams.get("copies") || "1")));

  const orgName = import.meta.env.VITE_ORG_NAME || "SAN JUAN DEL RÍO - H. AYUNTAMIENTO";
  const logoUrl = import.meta.env.VITE_LABEL_LOGO_URL || heraldica;
  const labelUrlBase = import.meta.env.VITE_LABEL_URL_BASE || window.location.origin;
  const isDemo = !import.meta.env.VITE_LABEL_URL_BASE || labelUrlBase.includes("localhost");

  // Load asset data for all inventory codes
  useEffect(() => {
    const loadAssetData = async () => {
      if (inventoryCodes.length === 0) {
        setIsRendering(false);
        return;
      }

      try {
        // Fetch all assets to get their descriptions and serial numbers
        const response = await listActivos({ pageSize: 1000 });
        const assetsMap = new Map<string, Activo>();
        
        response.data.items.forEach((activo: Activo) => {
          if (activo.numeroInventario) {
            assetsMap.set(activo.numeroInventario, activo);
          }
        });

        // Generate labels with asset data
        const labels: LabelData[] = [];
        inventoryCodes.forEach((code) => {
          const activo = assetsMap.get(code);
          for (let i = 0; i < copies; i++) {
            labels.push({
              id: `${code}-copy-${i + 1}`,
              code,
              copyNum: i + 1,
              descripcion: activo?.descripcion,
              numeroSerie: activo?.numeroSerie,
            });
          }
        });

        setAllLabels(labels);
      } catch (error) {
        console.error("Error loading asset data:", error);
        // Fallback: create labels without additional data
        const labels: LabelData[] = [];
        inventoryCodes.forEach((code) => {
          for (let i = 0; i < copies; i++) {
            labels.push({
              id: `${code}-copy-${i + 1}`,
              code,
              copyNum: i + 1,
            });
          }
        });
        setAllLabels(labels);
      } finally {
        // Small delay for rendering
        setTimeout(() => {
          setIsRendering(false);
        }, 500);
      }
    };

    loadAssetData();
  }, [inventoryCodes.join(","), copies]);

  useEffect(() => {
    // Focus on print button when loaded
    if (buttonRef.current && !isRendering) {
      buttonRef.current.focus();
    }
  }, [isRendering]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        handlePrint();
      } else if (e.key === "Enter" && !isRendering) {
        handlePrint();
      } else if (e.key === "Escape") {
        window.close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRendering]);

  const handlePrint = () => {
    if (isRendering) {
      toast({
        title: "Espera",
        description: "Las etiquetas aún se están renderizando...",
      });
      return;
    }
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  const totalLabels = allLabels.length;

  if (inventoryCodes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-lg">
            No se especificaron códigos de inventario
          </p>
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* PRIMERO: Área de impresión - debe estar antes en el DOM para evitar página en blanco */}
      <div className="print-container hidden print:block">
        {allLabels.map((label, index) => (
          <div
            key={label.id}
            className="label-page"
            style={{
              width: "50mm",
              height: "25mm",
              margin: 0,
              padding: 0,
              overflow: "hidden",
              pageBreakAfter: index < totalLabels - 1 ? "always" : "auto",
              pageBreakInside: "avoid",
            }}
          >
            <Label50x25
              inventoryCode={label.code}
              orgName={orgName}
              logoUrl={logoUrl}
              descripcion={label.descripcion}
              numeroSerie={label.numeroSerie}
              dpi={dpi}
              showQr={showQr}
              showBarcodeText={showBarcodeText}
              isDemo={isDemo}
              printMode={true}
            />
          </div>
        ))}
      </div>

      {/* DESPUÉS: UI de configuración - solo visible en pantalla */}
      <div className="screen-only print:hidden flex flex-col items-center justify-center min-h-screen bg-background p-4 gap-4">
        {isDemo && (
          <Badge variant="secondary" className="mb-2">
            Modo Demo
          </Badge>
        )}

        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Impresión de Etiquetas en Lote</h1>
          <div className="space-y-1 text-muted-foreground">
            <p>
              Se imprimirán <span className="font-semibold text-foreground">{totalLabels}</span> etiqueta
              {totalLabels !== 1 ? "s" : ""}
            </p>
            <p className="text-sm">
              ({inventoryCodes.length} activo{inventoryCodes.length !== 1 ? "s" : ""} × {copies} copia
              {copies !== 1 ? "s" : ""})
            </p>
            <p className="text-sm">
              Resolución: {dpi} DPI | QR: {showQr ? "Sí" : "No"} | Texto: {showBarcodeText ? "Sí" : "No"}
            </p>
          </div>

          {isRendering && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cargando datos y renderizando etiquetas...</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button ref={buttonRef} onClick={handlePrint} disabled={isRendering}>
            {isRendering ? "Renderizando..." : "Imprimir Todo"}
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
        </div>

        {/* Instrucciones de configuración de impresora */}
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 max-w-lg">
          <h3 className="font-semibold text-warning-foreground flex items-center gap-2">
            ⚙️ Configuración de Impresora de Etiquetas
          </h3>
          <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
            <li>En el diálogo de impresión, selecciona tu impresora de etiquetas</li>
            <li>Haz clic en <strong className="text-foreground">"Más opciones"</strong> o <strong className="text-foreground">"Propiedades"</strong></li>
            <li>Configura el tamaño de papel: <strong className="text-foreground">50mm × 25mm</strong> (o 5cm × 2.5cm)</li>
            <li>Establece márgenes en <strong className="text-foreground">0</strong></li>
            <li>Desactiva <strong className="text-foreground">"Ajustar a página"</strong> o <strong className="text-foreground">"Escalar"</strong></li>
          </ol>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: 50mm 25mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Eliminar completamente el div de UI de la impresión */
          .screen-only,
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            left: -9999px !important;
          }

          /* Ocultar TODO primero con visibility */
          *, *::before, *::after {
            visibility: hidden !important;
          }
          
          /* Mostrar SOLO el contenedor de impresión y sus hijos */
          .print-container,
          .print-container * {
            visibility: visible !important;
          }
          
          /* Posicionar el contenedor - ya está primero en el DOM */
          .print-container {
            display: block !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          html, body {
            width: 50mm !important;
            height: 25mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Ocultar elementos específicos de Lovable */
          [data-lovable-badge],
          [class*="lovable"],
          iframe,
          button[class*="lovable"] {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          .label-page {
            width: 50mm !important;
            height: 25mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }

          .label-page:first-child {
            page-break-before: avoid !important;
            break-before: avoid !important;
          }

          .label-page:last-child {
            page-break-after: auto !important;
          }

          canvas {
            width: 50mm !important;
            height: 25mm !important;
            max-width: 50mm !important;
            max-height: 25mm !important;
            display: block !important;
            visibility: visible !important;
          }
        }
      `}</style>
    </>
  );
};

export default EtiquetaLote;
