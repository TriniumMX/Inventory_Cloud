import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { RevisionSession } from "@/lib/revisionStore";
import { analyzeSession, getActivosInfo } from "@/lib/revisionStore";
import { exportarResguardoPDF, exportarActaIncidenciasPDF, getNombreArchivoResguardo } from "@/lib/exportResguardo";

interface SessionSummaryProps {
  session: RevisionSession;
}

interface ActivoInfo {
  numeroInventario: string;
  descripcion: string | null;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  ultimoNomina: string | null;
}

export function SessionSummary({ session }: SessionSummaryProps) {
  const analysis = analyzeSession(session);
  const orgName = import.meta.env.VITE_ORG_NAME || "Organización";
  const [loading, setLoading] = useState(false);
  const [activosInfo, setActivosInfo] = useState<Map<string, ActivoInfo>>(new Map());
  const [dataLoaded, setDataLoaded] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");

  const canPrintResguardo = analysis.missing.size === 0;

  // Cargar información de activos al montar
  useEffect(() => {
    const loadActivosInfo = async () => {
      const allInvs = [
        ...Array.from(analysis.found),
        ...Array.from(analysis.missing),
        ...Array.from(analysis.extra),
      ];

      if (allInvs.length === 0) {
        setDataLoaded(true);
        return;
      }

      try {
        const items = await getActivosInfo(allInvs);

        const infoMap = new Map<string, ActivoInfo>();
        items.forEach((item) => {
          if (item.numero_inventario) {
            infoMap.set(item.numero_inventario, {
              numeroInventario: item.numero_inventario,
              descripcion: item.descripcion,
              marca: item.marca,
              modelo: item.modelo,
              numeroSerie: item.numero_serie,
              ultimoNomina: item.ultimo_nomina,
            });
          }
        });
        setActivosInfo(infoMap);
      } catch (err) {
        console.error("Error cargando info de activos:", err);
      } finally {
        setDataLoaded(true);
      }
    };

    loadActivosInfo();
  }, [analysis.found, analysis.missing, analysis.extra]);

  const formatearFecha = (): string => {
    const opciones: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date().toLocaleDateString("es-MX", opciones);
  };

  const exportCSV = () => {
    try {
      const rows = [
        ["Categoría", "Número de Inventario", "Timestamp Primera Lectura", "Conteo", "Notas"],
      ];

      const scanCounts = new Map<string, number>();
      const firstScans = new Map<string, string>();
      for (const scan of session.scans) {
        scanCounts.set(scan.inv, (scanCounts.get(scan.inv) || 0) + 1);
        if (!firstScans.has(scan.inv)) {
          firstScans.set(scan.inv, scan.ts);
        }
      }

      for (const inv of analysis.found) {
        rows.push([
          "OK",
          inv,
          firstScans.get(inv) || "",
          scanCounts.get(inv)?.toString() || "1",
          "",
        ]);
      }

      for (const inv of analysis.missing) {
        rows.push(["FALTANTE", inv, "", "0", ""]);
      }

      for (const inv of analysis.extra) {
        rows.push([
          "EXTRAÑO",
          inv,
          firstScans.get(inv) || "",
          scanCounts.get(inv)?.toString() || "1",
          "",
        ]);
      }

      const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `revision-${session.id}-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "CSV exportado",
        description: "El archivo se ha descargado correctamente.",
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo CSV.",
        variant: "destructive",
      });
    }
  };

  const handleExportResguardo = async () => {
    setLoading(true);
    try {
      const bienes = Array.from(analysis.found).map((inv) => {
        const info = activosInfo.get(inv);
        return {
          numeroInventario: inv,
          descripcion: info?.descripcion || "",
          marca: info?.marca || "",
          modelo: info?.modelo || "",
          numeroSerie: info?.numeroSerie || "",
        };
      });

      const url = await exportarResguardoPDF({
        responsable: {
          nombre: session.target.responsableNombre,
          nomina: String(session.target.responsableId),
          tipo: session.target.responsableTipo === "Empleado" ? "empleado" : "institucion",
        },
        bienes,
      });

      const fileName = getNombreArchivoResguardo(
        String(session.target.responsableId),
        session.target.responsableNombre,
      );
      setPdfPreviewUrl(url);
      setPdfFileName(fileName);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el PDF.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportIncidencias = async () => {
    setLoading(true);
    try {
      const faltantes = Array.from(analysis.missing).map((inv) => {
        const info = activosInfo.get(inv);
        return {
          numeroInventario: inv,
          descripcion: info?.descripcion || undefined,
        };
      });

      const extranos = Array.from(analysis.extra).map((inv) => {
        const info = activosInfo.get(inv);
        return {
          numeroInventario: inv,
          descripcion: info?.descripcion || undefined,
          responsableActual: info?.ultimoNomina || undefined,
        };
      });

      const url = await exportarActaIncidenciasPDF({
        responsable: {
          nombre: session.target.responsableNombre,
          nomina: String(session.target.responsableId),
          tipo: session.target.responsableTipo === "Empleado" ? "empleado" : "institucion",
        },
        fechaRevision: formatearFecha(),
        resumen: {
          esperados: session.expected.length,
          encontrados: analysis.found.size,
          faltantes: analysis.missing.size,
          extranos: analysis.extra.size,
        },
        faltantes,
        extranos,
      });

      const fileName = getNombreArchivoResguardo(
        String(session.target.responsableId),
        session.target.responsableNombre,
        'incidencias',
      );
      setPdfPreviewUrl(url);
      setPdfFileName(fileName);
    } catch (error) {
      console.error("Error exporting incidencias PDF:", error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el acta de incidencias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClosePdfPreview = useCallback(() => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    setPdfFileName("");
  }, [pdfPreviewUrl]);

  const handleDownloadPdf = useCallback(() => {
    if (!pdfPreviewUrl) return;
    const link = document.createElement("a");
    link.href = pdfPreviewUrl;
    link.download = pdfFileName;
    link.click();
  }, [pdfPreviewUrl, pdfFileName]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Revisión</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info de la revisión */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Organización</div>
            <div className="font-medium">{orgName}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Fecha</div>
            <div className="font-medium">{new Date(session.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Tipo</div>
            <div className="font-medium">{session.target.responsableTipo}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Responsable</div>
            <div className="font-medium">{session.target.responsableNombre}</div>
          </div>
        </div>

        {/* Resumen de conteos */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{analysis.found.size}</div>
            <div className="text-xs text-muted-foreground">Encontrados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{analysis.missing.size}</div>
            <div className="text-xs text-muted-foreground">Faltantes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{analysis.extra.size}</div>
            <div className="text-xs text-muted-foreground">Extraños</div>
          </div>
        </div>

        {/* Estado de la revisión */}
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            canPrintResguardo
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          {canPrintResguardo ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                {analysis.extra.size === 0
                  ? "Revisión completada sin incidencias"
                  : `Revisión completada. Se encontraron ${analysis.extra.size} bienes extraños.`}
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                Revisión con incidencias: {analysis.missing.size} faltantes, {analysis.extra.size}{" "}
                extraños
              </span>
            </>
          )}
        </div>

        {/* Total esperado vs escaneado */}
        <div className="flex justify-between items-center p-4 border rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground">Artículos esperados</div>
            <div className="text-xl font-bold">{session.expected.length}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Escaneos únicos</div>
            <div className="text-xl font-bold">{new Set(session.scans.map((s) => s.inv)).size}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total escaneos</div>
            <div className="text-xl font-bold">{session.scans.length}</div>
          </div>
        </div>

        {/* Botones de exportación */}
        <div className="flex flex-col gap-3">
          {/* Botón principal según estado */}
          {canPrintResguardo ? (
            <Button
              onClick={handleExportResguardo}
              disabled={loading || !dataLoaded}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Imprimir Resguardo de Conformidad
            </Button>
          ) : (
            <Button
              onClick={handleExportIncidencias}
              disabled={loading || !dataLoaded}
              variant="destructive"
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Exportar Acta de Incidencias
            </Button>
          )}

          {/* Botón secundario CSV */}
          <Button onClick={exportCSV} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Modal de preview PDF */}
        <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => !open && handleClosePdfPreview()}>
          <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <DialogTitle className="text-lg">Previsualización: {pdfFileName}</DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-1" />
                  Descargar
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <iframe
                src={pdfPreviewUrl || ""}
                className="w-full h-full rounded-md border"
                title="Previsualización PDF"
              />
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
