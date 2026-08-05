import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FileText, Download, FileBarChart, FileSpreadsheet, Loader2,
  CalendarIcon, Building2, Package, Users, TrendingUp,
} from "lucide-react";
import { ProtectedPage } from "@/components/ProtectedPage";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getAllActivosForReport, getAllActivosSinAsignar, getActivosPorRangoAlta,
  listBienesInmuebles, logClientEvent,
} from "@/lib/api";
import {
  exportarInventarioGeneralExcel, exportarInventarioGeneralPDF,
  exportarBienesSinAsignarExcel, exportarBienesSinAsignarPDF,
  exportarAltasPorFechaExcel, exportarAltasPorFechaPDF,
  exportarInmueblesExcel, exportarInmueblesPDF,
  InmuebleReporte,
} from "@/lib/exportReportes";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Reporte {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;          // Tailwind text color
  accentBg: string;        // Tailwind bg color for icon container
  accentBorder: string;    // Tailwind border color
  accentBar: string;       // Tailwind bg color for the top accent bar (literal class, must match card's accent)
  badge?: string;
  enabled: boolean;
  needsDates?: boolean;
}

const reportes: Reporte[] = [
  {
    id: "inventario-general",
    title: "Inventario General",
    description: "Listado completo de todos los bienes muebles y enseres registrados en el sistema.",
    icon: Package,
    accent: "text-blue-700",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    accentBar: "bg-blue-600",
    enabled: true,
  },
  {
    id: "bienes-sin-asignar",
    title: "Bienes Sin Asignar",
    description: "Bienes dados de alta sin resguardatario asignado que requieren atención.",
    icon: Users,
    accent: "text-orange-700",
    accentBg: "bg-orange-50",
    accentBorder: "border-orange-200",
    accentBar: "bg-orange-600",
    enabled: true,
  },
  {
    id: "altas-por-fecha",
    title: "Altas por Fecha",
    description: "Bienes dados de alta en un rango de fechas específico.",
    icon: TrendingUp,
    accent: "text-green-700",
    accentBg: "bg-green-50",
    accentBorder: "border-green-200",
    accentBar: "bg-green-600",
    badge: "Selecciona rango",
    enabled: true,
    needsDates: true,
  },
  {
    id: "bienes-inmuebles",
    title: "Bienes Inmuebles",
    description: "Inventario completo del patrimonio inmobiliario con datos catastrales.",
    icon: Building2,
    accent: "text-purple-700",
    accentBg: "bg-purple-50",
    accentBorder: "border-purple-200",
    accentBar: "bg-purple-600",
    enabled: true,
  },
];

export default function Reportes() {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedReporte, setSelectedReporte] = useState<string | null>(null);

  const [fechaModalOpen, setFechaModalOpen] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
  const [fechaFin, setFechaFin] = useState<Date | undefined>();

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");

  const handleDescargar = (rep: Reporte) => {
    if (rep.needsDates) {
      setSelectedReporte(rep.id);
      setFechaInicio(undefined);
      setFechaFin(undefined);
      setFechaModalOpen(true);
    } else {
      setSelectedReporte(rep.id);
      setModalOpen(true);
    }
  };

  const handleConfirmarFechas = () => {
    if (!fechaInicio || !fechaFin) { toast.warning("Selecciona ambas fechas"); return; }
    if (fechaFin < fechaInicio) { toast.warning("La fecha fin no puede ser menor a la fecha inicio"); return; }
    setFechaModalOpen(false);
    setModalOpen(true);
  };

  const handleExportar = async (formato: "excel" | "pdf") => {
    if (!selectedReporte) return;
    setLoading(true);
    setModalOpen(false);

    try {
      if (selectedReporte === "inventario-general") {
        toast.info("Obteniendo datos del inventario...");
        const items = await getAllActivosForReport(1);
        if (!items.length) { toast.warning("No hay bienes para exportar"); return; }
        toast.info(`Generando reporte de ${items.length} bienes...`);
        if (formato === "excel") {
          exportarInventarioGeneralExcel(items);
          toast.success("Excel descargado correctamente");
          logClientEvent({ tabla: "reportes", accion: "EXPORT", campo: "tipo", valorNuevo: "inventario-general-excel" }).catch(() => {});
        } else {
          const url = await exportarInventarioGeneralPDF(items);
          setPdfFileName(`Inventario_General_${new Date().toISOString().split("T")[0]}.pdf`);
          setPdfPreviewUrl(url);
          logClientEvent({ tabla: "reportes", accion: "EXPORT", campo: "tipo", valorNuevo: "inventario-general-pdf" }).catch(() => {});
        }

      } else if (selectedReporte === "bienes-sin-asignar") {
        toast.info("Obteniendo bienes sin asignar...");
        const items = await getAllActivosSinAsignar();
        if (!items.length) { toast.warning("No hay bienes sin asignar para exportar"); return; }
        toast.info(`Generando reporte de ${items.length} bienes...`);
        if (formato === "excel") {
          exportarBienesSinAsignarExcel(items);
          toast.success("Excel descargado correctamente");
          logClientEvent({ tabla: "reportes", accion: "EXPORT", campo: "tipo", valorNuevo: "bienes-sin-asignar-excel" }).catch(() => {});
        } else {
          const url = await exportarBienesSinAsignarPDF(items);
          setPdfFileName(`Bienes_Sin_Asignar_${new Date().toISOString().split("T")[0]}.pdf`);
          setPdfPreviewUrl(url);
          logClientEvent({ tabla: "reportes", accion: "EXPORT", campo: "tipo", valorNuevo: "bienes-sin-asignar-pdf" }).catch(() => {});
        }

      } else if (selectedReporte === "altas-por-fecha" && fechaInicio && fechaFin) {
        const inicioStr = format(fechaInicio, "yyyy-MM-dd");
        const finStr = format(fechaFin, "yyyy-MM-dd");
        const inicioDisplay = format(fechaInicio, "dd/MM/yyyy");
        const finDisplay = format(fechaFin, "dd/MM/yyyy");
        toast.info(`Obteniendo altas del ${inicioDisplay} al ${finDisplay}...`);
        const items = await getActivosPorRangoAlta(inicioStr, finStr);
        if (!items.length) { toast.warning("No hay bienes dados de alta en ese rango de fechas"); return; }
        toast.info(`Generando reporte de ${items.length} bienes...`);
        if (formato === "excel") {
          exportarAltasPorFechaExcel(items, inicioDisplay, finDisplay);
          toast.success("Excel descargado correctamente");
          logClientEvent({ tabla: "reportes", accion: "EXPORT", campo: "tipo", valorNuevo: `altas-por-fecha-excel:${inicioStr}:${finStr}` }).catch(() => {});
        } else {
          const url = await exportarAltasPorFechaPDF(items, inicioDisplay, finDisplay);
          setPdfFileName(`Altas_${inicioDisplay}_a_${finDisplay}.pdf`);
          setPdfPreviewUrl(url);
          logClientEvent({ tabla: "reportes", accion: "EXPORT", campo: "tipo", valorNuevo: `altas-por-fecha-pdf:${inicioStr}:${finStr}` }).catch(() => {});
        }

      } else if (selectedReporte === "bienes-inmuebles") {
        toast.info("Obteniendo bienes inmuebles...");
        const raw = await listBienesInmuebles();
        if (!raw.length) { toast.warning("No hay bienes inmuebles registrados"); return; }
        const items: InmuebleReporte[] = raw.map((i: any) => ({
          numeroInventario: i.numeroInventario || "",
          nombre: i.nombre || "",
          descripcion: i.descripcion || "",
          tipoNombre: i.tipoNombre || "",
          direccion: i.direccion || "",
          colonia: i.colonia || "",
          municipio: i.municipio || "",
          superficieTerreno: i.superficieTerreno,
          superficieConstruccion: i.superficieConstruccion,
          numeroEscritura: i.numeroEscritura || "",
          fechaEscritura: i.fechaEscritura,
          notaria: i.notaria || "",
          claveCatastral: i.claveCatastral || "",
          valorCatastral: i.valorCatastral,
          valorComercial: i.valorComercial,
          costoAdquisicion: i.costoAdquisicion,
          fechaAdquisicion: i.fechaAdquisicion,
          responsableNomina: i.responsableNomina || "",
        }));
        toast.info(`Generando reporte de ${items.length} inmuebles...`);
        if (formato === "excel") {
          exportarInmueblesExcel(items);
          toast.success("Excel descargado correctamente");
          logClientEvent({ tabla: "reportes", accion: "EXPORT", campo: "tipo", valorNuevo: "bienes-inmuebles-excel" }).catch(() => {});
        } else {
          const url = await exportarInmueblesPDF(items);
          setPdfFileName(`Bienes_Inmuebles_${new Date().toISOString().split("T")[0]}.pdf`);
          setPdfPreviewUrl(url);
          logClientEvent({ tabla: "reportes", accion: "EXPORT", campo: "tipo", valorNuevo: "bienes-inmuebles-pdf" }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Error generando reporte:", err);
      toast.error("Error al generar el reporte");
    } finally {
      setLoading(false);
      setSelectedReporte(null);
    }
  };

  return (
    <ProtectedPage requiredModulo="reportes">
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Reportes" }]} />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
            <p className="text-muted-foreground">Genera y descarga reportes del inventario</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {reportes.map((rep) => {
              const Icon = rep.icon;
              const isLoading = loading && selectedReporte === rep.id;
              return (
                <div
                  key={rep.id}
                  className={cn(
                    "rounded-xl border bg-card overflow-hidden flex flex-col transition-shadow hover:shadow-md",
                    !rep.enabled && "opacity-60",
                    rep.accentBorder
                  )}
                >
                  {/* Top accent bar */}
                  <div className={cn("h-1", rep.accentBar)} />

                  <div className="p-5 flex flex-col gap-4 flex-1">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <div className={cn("p-3 rounded-xl border flex-shrink-0", rep.accentBg, rep.accentBorder)}>
                        <Icon className={cn("h-6 w-6", rep.accent)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base">{rep.title}</h3>
                          {rep.badge && (
                            <Badge variant="outline" className="text-[10px] font-medium">
                              {rep.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {rep.description}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-dashed">
                      <span className="text-xs text-muted-foreground">
                        Disponible en Excel y PDF
                      </span>
                      <Button
                        size="sm"
                        disabled={!rep.enabled || loading}
                        onClick={() => handleDescargar(rep)}
                        className={cn(
                          "gap-2 text-sm font-medium",
                          rep.id === "inventario-general" && "bg-blue-700 hover:bg-blue-800 text-white",
                          rep.id === "bienes-sin-asignar" && "bg-orange-600 hover:bg-orange-700 text-white",
                          rep.id === "altas-por-fecha" && "bg-green-700 hover:bg-green-800 text-white",
                          rep.id === "bienes-inmuebles" && "bg-purple-700 hover:bg-purple-800 text-white",
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {isLoading ? "Generando..." : "Descargar"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Modal de rango de fechas */}
      <Dialog open={fechaModalOpen} onOpenChange={setFechaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar rango de fechas</DialogTitle>
            <DialogDescription>
              Selecciona el periodo de altas que deseas incluir en el reporte
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechaInicio && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaInicio ? format(fechaInicio, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fechaInicio} onSelect={setFechaInicio} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechaFin && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaFin ? format(fechaFin, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fechaFin} onSelect={setFechaFin} disabled={(date) => fechaInicio ? date < fechaInicio : false} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFechaModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleConfirmarFechas} disabled={!fechaInicio || !fechaFin}>Generar reporte</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de selección de formato */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Seleccionar formato</DialogTitle>
            <DialogDescription>Elige el formato en el que deseas descargar el reporte</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 h-24 flex-col gap-2 border-2 hover:border-green-500 hover:bg-green-50" onClick={() => handleExportar("excel")}>
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <span className="font-medium text-sm">Excel (.xlsx)</span>
            </Button>
            <Button variant="outline" className="flex-1 h-24 flex-col gap-2 border-2 hover:border-red-500 hover:bg-red-50" onClick={() => handleExportar("pdf")}>
              <FileText className="h-8 w-8 text-red-600" />
              <span className="font-medium text-sm">PDF</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal previsualización PDF */}
      <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => { if (!open && pdfPreviewUrl) { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); setPdfFileName(""); } }}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-500" />
              {pdfFileName || "Previsualización PDF"}
            </DialogTitle>
            <DialogDescription>Revisa el documento antes de descargarlo</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6">
            <iframe src={pdfPreviewUrl || ""} className="w-full h-full rounded-md border" title="Previsualización PDF" />
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => { if (pdfPreviewUrl) { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); setPdfFileName(""); } }}>
              Cerrar
            </Button>
            <Button onClick={() => { if (pdfPreviewUrl) { const a = document.createElement("a"); a.href = pdfPreviewUrl; a.download = pdfFileName || "reporte.pdf"; a.click(); } }}>
              <Download className="mr-2 h.4 w-4" /> Descargar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}
