import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { NuevoResguardoWizard } from "@/components/modals/NuevoResguardoWizard";
import { ReasignarBienModal } from "@/components/modals/ReasignarBienModal";
import { TraspasoMasivoModal } from "@/components/modals/TraspasoMasivoModal";
import { 
  Plus, 
  User, 
  Building2, 
  ArrowLeft, 
  Search,
  Package,
  Loader2,
  ArrowLeftRight,
  FileSpreadsheet,
  FileText,
  Download,
  X
} from "lucide-react";
import {
  exportarResguardoExcel,
  exportarResguardoPDF,
  crearExportDataEmpleado,
  crearExportDataInstitucion,
  getNombreArchivoResguardo,
  getResguardoExcelSheetParams,
  getNombreArchivoResguardoExcel,
} from "@/lib/exportResguardo";
import { ExcelPreviewDialog } from "@/components/shared/ExcelPreviewDialog";
import type { BuildSheetParams } from "@/lib/excelStyle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listConsignas, buscarEmpleado, listActivosByUltimoNomina, traspasarInventarioCompleto } from "@/lib/api";
import { Empleado, Consigna } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ProtectedPage } from "@/components/ProtectedPage";
import { SecureButton } from "@/components/SecureButton";

interface ActivoAsignado {
  id: string;
  numeroInventario: string;
  descripcion: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  clasificacionNombre?: string;
  estatus: string;
}

export default function Resguardos() {
  const { toast } = useToast();
  
  // Estado para tipo de inventario (1 = Bienes Muebles, 2 = Enseres)
  const [tipoInventario, setTipoInventario] = useState<1 | 2>(1);
  
  // Estados para el flujo de selección
  const [tipoDestino, setTipoDestino] = useState<"empleado" | "institucion" | null>(null);
  const [nominaBuscada, setNominaBuscada] = useState("");
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null);
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState<Consigna | null>(null);
  const [bienesAsignados, setBienesAsignados] = useState<ActivoAsignado[]>([]);
  const [buscando, setBuscando] = useState(false);
  
  // Catálogos
  const [consignas, setConsignas] = useState<Consigna[]>([]);
  const [loadingConsignas, setLoadingConsignas] = useState(true);
  
  // Modal de nuevo resguardo
  const [wizardOpen, setWizardOpen] = useState(false);
  
  // Modal de reasignación
  const [modalReasignarOpen, setModalReasignarOpen] = useState(false);
  const [bienAReasignar, setBienAReasignar] = useState<ActivoAsignado | null>(null);

  // Modal de traspaso masivo
  const [modalTraspasoOpen, setModalTraspasoOpen] = useState(false);

  // PDF preview
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const [excelPreviewOpen, setExcelPreviewOpen] = useState(false);
  const [excelSheetParams, setExcelSheetParams] = useState<BuildSheetParams | null>(null);
  const [excelFileName, setExcelFileName] = useState("");

  // Cargar consignas al inicio
  useEffect(() => {
    const loadConsignas = async () => {
      try {
        const response = await listConsignas();
        setConsignas(response.data.items);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar las instituciones",
          variant: "destructive",
        });
      } finally {
        setLoadingConsignas(false);
      }
    };
    loadConsignas();
  }, []);

  // Buscar empleado y sus bienes
  const handleBuscarEmpleado = async () => {
    if (!nominaBuscada.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un número de nómina",
        variant: "destructive",
      });
      return;
    }

    setBuscando(true);
    try {
      // Buscar datos del empleado
      const empResponse = await buscarEmpleado(nominaBuscada.trim());
      setEmpleadoSeleccionado(empResponse.data);

      // Buscar bienes asignados a este empleado, filtrado por tipo
      const bienesResponse = await listActivosByUltimoNomina(nominaBuscada.trim(), tipoInventario);
      setBienesAsignados(bienesResponse.data.items);

      // Verificar si el empleado está dado de baja
      if (empResponse.data.activo === "B") {
        setModalTraspasoOpen(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo buscar el empleado",
        variant: "destructive",
      });
      setEmpleadoSeleccionado(null);
      setBienesAsignados([]);
    } finally {
      setBuscando(false);
    }
  };

  // Seleccionar institución y buscar sus bienes
  const handleSeleccionarInstitucion = async (consignaId: string) => {
    const consigna = consignas.find(c => c.id === parseInt(consignaId));
    if (!consigna) return;

    setInstitucionSeleccionada(consigna);
    setBuscando(true);

    try {
      // Buscar bienes asignados a esta institución (por nombre de consigna), filtrado por tipo
      const bienesResponse = await listActivosByUltimoNomina(consigna.nombre, tipoInventario);
      setBienesAsignados(bienesResponse.data.items);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los bienes",
        variant: "destructive",
      });
      setBienesAsignados([]);
    } finally {
      setBuscando(false);
    }
  };

  // Resetear búsqueda
  const resetearBusqueda = () => {
    setTipoDestino(null);
    setNominaBuscada("");
    setEmpleadoSeleccionado(null);
    setInstitucionSeleccionada(null);
    setBienesAsignados([]);
  };

  // Abrir modal de reasignación
  const abrirModalReasignacion = (bien: ActivoAsignado) => {
    setBienAReasignar(bien);
    setModalReasignarOpen(true);
  };

  // Callback después de reasignar exitosamente
  const handleReasignacionExitosa = () => {
    // Recargar la lista de bienes
    if (empleadoSeleccionado) {
      handleBuscarEmpleado();
    } else if (institucionSeleccionada) {
      handleSeleccionarInstitucion(institucionSeleccionada.id.toString());
    }
  };

  // Callback después de traspaso masivo exitoso
  const handleTraspasoExitoso = () => {
    // Resetear la búsqueda ya que el empleado de baja ya no tiene bienes
    resetearBusqueda();
  };

  // Callback cuando el usuario elige solo consultar
  const handleSoloConsultar = () => {
    // No hacer nada, los bienes ya están cargados
  };

  // Obtener el destinatario actual para el modal
  const getDestinatarioActual = (): string => {
    if (empleadoSeleccionado) {
      return empleadoSeleccionado.nomina;
    }
    if (institucionSeleccionada) {
      return institucionSeleccionada.nombre;
    }
    return "";
  };

  // Vista previa del Excel (el botón "Excel" ahora abre la previsualización)
  const handleExportExcel = () => {
    try {
      let exportData;
      if (empleadoSeleccionado) {
        exportData = crearExportDataEmpleado(empleadoSeleccionado, bienesAsignados);
      } else if (institucionSeleccionada) {
        exportData = crearExportDataInstitucion(institucionSeleccionada, bienesAsignados);
      } else {
        return;
      }
      exportData = { ...exportData, tipoActivo: tipoInventario };
      setExcelSheetParams(getResguardoExcelSheetParams(exportData));
      setExcelFileName(getNombreArchivoResguardoExcel(exportData));
      setExcelPreviewOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar la vista previa del Excel",
        variant: "destructive",
      });
    }
  };

  const handleDownloadExcel = () => {
    try {
      let exportData;
      if (empleadoSeleccionado) {
        exportData = crearExportDataEmpleado(empleadoSeleccionado, bienesAsignados);
      } else if (institucionSeleccionada) {
        exportData = crearExportDataInstitucion(institucionSeleccionada, bienesAsignados);
      } else {
        return;
      }
      exportarResguardoExcel({ ...exportData, tipoActivo: tipoInventario });
      toast({
        title: "Exportación exitosa",
        description: "El archivo Excel se ha descargado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el archivo Excel",
        variant: "destructive",
      });
    }
  };

  // Exportar a PDF
  const handleExportPDF = async () => {
    try {
      let url: string;
      let fileName: string;
      if (empleadoSeleccionado) {
        const exportData = crearExportDataEmpleado(empleadoSeleccionado, bienesAsignados);
        url = await exportarResguardoPDF({ ...exportData, tipoActivo: tipoInventario });
        fileName = getNombreArchivoResguardo(empleadoSeleccionado.nomina, empleadoSeleccionado.nombre);
      } else if (institucionSeleccionada) {
        const exportData = crearExportDataInstitucion(institucionSeleccionada, bienesAsignados);
        url = await exportarResguardoPDF({ ...exportData, tipoActivo: tipoInventario });
        fileName = getNombreArchivoResguardo(undefined, institucionSeleccionada.nombre);
      } else return;
      setPdfPreviewUrl(url);
      setPdfFileName(fileName);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el archivo PDF",
        variant: "destructive",
      });
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

  // Columnas para la tabla de bienes
  const columnsBienes = [
    {
      key: "numeroInventario",
      label: "# Inventario",
      render: (item: ActivoAsignado) => (
        <span className="font-medium text-primary">{item.numeroInventario}</span>
      ),
    },
    {
      key: "descripcion",
      label: "Descripción",
    },
    {
      key: "marca",
      label: "Marca",
    },
    {
      key: "modelo",
      label: "Modelo",
    },
    {
      key: "clasificacionNombre",
      label: "Clasificación",
    },
    {
      key: "estatus",
      label: "Estado",
      render: (item: ActivoAsignado) => (
        <Badge
          variant={item.estatus === "ACTIVO" ? "default" : "secondary"}
          className={
            item.estatus === "ACTIVO"
              ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }
        >
          {item.estatus}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "",
      render: (item: ActivoAsignado) => (
        <SecureButton
          requiredModulo="resguardos"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            abrirModalReasignacion(item);
          }}
        >
          <ArrowLeftRight className="h-4 w-4 mr-1" />
          Reasignar
        </SecureButton>
      ),
    },
  ];

  // Vista de selección inicial
  const renderSeleccionTipo = () => (
    <div className="space-y-6">
      {/* Selector de tipo de inventario */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border p-1 bg-muted/50">
          <Button
            variant={tipoInventario === 1 ? "default" : "ghost"}
            size="sm"
            onClick={() => setTipoInventario(1)}
            className="rounded-md"
          >
            <Package className="h-4 w-4 mr-2" />
            Bienes Muebles
          </Button>
          <Button
            variant={tipoInventario === 2 ? "default" : "ghost"}
            size="sm"
            onClick={() => setTipoInventario(2)}
            className="rounded-md"
          >
            <Package className="h-4 w-4 mr-2" />
            Enseres
          </Button>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-lg sm:text-2xl font-semibold">¿Qué tipo de resguardo desea consultar?</h2>
        <p className="text-muted-foreground">
          Seleccione si desea ver los {tipoInventario === 1 ? "bienes muebles" : "enseres"} asignados a un empleado o a una institución
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
          onClick={() => setTipoDestino("empleado")}
        >
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Empleado</CardTitle>
            <CardDescription>
              Buscar por número de nómina para ver los {tipoInventario === 1 ? "bienes muebles" : "enseres"} asignados
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
          onClick={() => setTipoDestino("institucion")}
        >
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Comodatos</CardTitle>
            <CardDescription>
              Seleccionar una institución en comodato para ver sus {tipoInventario === 1 ? "bienes muebles" : "enseres"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="flex justify-center pt-4">
        <SecureButton
          requiredModulo="resguardos"
          onClick={() => setWizardOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Resguardo de {tipoInventario === 1 ? "Bienes Muebles" : "Enseres"}
        </SecureButton>
      </div>
    </div>
  );

  // Vista de búsqueda de empleado
  const renderBusquedaEmpleado = () => (
    <div className="space-y-6">
      {/* Header con botón volver */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={resetearBusqueda}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Buscar Empleado</h2>
          <p className="text-sm text-muted-foreground">
            Ingrese el número de nómina para ver sus {tipoInventario === 1 ? "bienes muebles" : "enseres"} asignados
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {tipoInventario === 1 ? "Bienes Muebles" : "Enseres"}
        </Badge>
      </div>

      {/* Buscador */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Número de nómina (ej: 6021)"
                value={nominaBuscada}
                onChange={(e) => setNominaBuscada(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscarEmpleado()}
              />
            </div>
            <Button onClick={handleBuscarEmpleado} disabled={buscando} className="sm:w-auto">
              {buscando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Datos del empleado */}
      {empleadoSeleccionado && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>{empleadoSeleccionado.nombre}</CardTitle>
                  {empleadoSeleccionado.activo === "B" && (
                    <Badge variant="destructive">BAJA</Badge>
                  )}
                </div>
                <CardDescription>
                  Nómina: {empleadoSeleccionado.nomina}
                  {empleadoSeleccionado.departamento && ` • ${empleadoSeleccionado.departamento}`}
                  {empleadoSeleccionado.puesto && ` • ${empleadoSeleccionado.puesto}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Tabla de bienes asignados */}
      {empleadoSeleccionado && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base sm:text-lg font-medium">
                {tipoInventario === 1 ? "Bienes Muebles" : "Enseres"} Asignados ({bienesAsignados.length})
              </h3>
            </div>
            {bienesAsignados.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            )}
          </div>

          {bienesAsignados.length > 0 ? (
            <DataTable 
              data={bienesAsignados} 
              columns={columnsBienes} 
              searchable={true}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Este empleado no tiene {tipoInventario === 1 ? "bienes muebles" : "enseres"} asignados
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  // Vista de selección de institución
  const renderSeleccionInstitucion = () => (
    <div className="space-y-6">
      {/* Header con botón volver */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={resetearBusqueda}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Seleccionar Institución</h2>
          <p className="text-sm text-muted-foreground">
            Seleccione la institución para ver sus {tipoInventario === 1 ? "bienes muebles" : "enseres"} asignados
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {tipoInventario === 1 ? "Bienes Muebles" : "Enseres"}
        </Badge>
      </div>

      {/* Selector de institución */}
      <Card>
        <CardContent className="pt-6">
          <SearchableSelect
            options={consignas.map((consigna) => ({
              value: consigna.id.toString(),
              label: consigna.nombre,
            }))}
            value={institucionSeleccionada?.id?.toString() || ""}
            onValueChange={handleSeleccionarInstitucion}
            disabled={loadingConsignas}
            placeholder="Seleccione una institución..."
            searchPlaceholder="Buscar institución…"
          />
        </CardContent>
      </Card>

      {/* Datos de la institución */}
      {institucionSeleccionada && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{institucionSeleccionada.nombre}</CardTitle>
                <CardDescription>Institución en Comodato</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Tabla de bienes asignados */}
      {institucionSeleccionada && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base sm:text-lg font-medium">
                {tipoInventario === 1 ? "Bienes Muebles" : "Enseres"} Asignados ({bienesAsignados.length})
              </h3>
            </div>
            {bienesAsignados.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            )}
          </div>

          {buscando ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bienesAsignados.length > 0 ? (
            <DataTable 
              data={bienesAsignados} 
              columns={columnsBienes} 
              searchable={true}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Esta institución no tiene {tipoInventario === 1 ? "bienes muebles" : "enseres"} asignados
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  return (
    <ProtectedPage requiredModulo="resguardos">
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[{ label: "Resguardos" }]} />
        <main className="flex-1 overflow-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Resguardos</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Consulta de bienes asignados a empleados e instituciones
              </p>
            </div>
          </div>

          {/* Estadísticas solo en vista inicial */}
          {!tipoDestino && (
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                title="Empleados"
                value=""
                icon={User}
                description="Buscar bienes por número de nómina"
              />
              <StatCard
                title="Instituciones"
                value={consignas.length}
                icon={Building2}
                description="Instituciones en comodato registradas"
              />
            </div>
          )}

          {/* Contenido principal basado en el estado */}
          {!tipoDestino && renderSeleccionTipo()}
          {tipoDestino === "empleado" && renderBusquedaEmpleado()}
          {tipoDestino === "institucion" && renderSeleccionInstitucion()}
        </main>

        <NuevoResguardoWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onSuccess={() => {
            // Si estamos viendo bienes de alguien, recargar
            if (empleadoSeleccionado) {
              handleBuscarEmpleado();
            } else if (institucionSeleccionada) {
              handleSeleccionarInstitucion(institucionSeleccionada.id.toString());
            }
          }}
          tipoActivo={tipoInventario}
        />

        <ReasignarBienModal
          open={modalReasignarOpen}
          onOpenChange={setModalReasignarOpen}
          bien={bienAReasignar}
          destinatarioActual={getDestinatarioActual()}
          onSuccess={handleReasignacionExitosa}
        />

        <TraspasoMasivoModal
          open={modalTraspasoOpen}
          onOpenChange={setModalTraspasoOpen}
          empleadoBaja={empleadoSeleccionado}
          bienesAsignados={bienesAsignados}
          onSuccess={handleTraspasoExitoso}
          onSoloConsultar={handleSoloConsultar}
        />
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
        <ExcelPreviewDialog
          open={excelPreviewOpen}
          onOpenChange={setExcelPreviewOpen}
          fileName={excelFileName}
          sheetParams={excelSheetParams}
          onDownload={handleDownloadExcel}
        />
      </div>
    </ProtectedPage>
  );
}
