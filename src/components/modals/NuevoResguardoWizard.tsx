import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Search, User, Package, FileText, Building2 } from "lucide-react";
import { buscarEmpleado, listActivos, createResguardo, listConsignas } from "@/lib/api";
import { Empleado, Activo, ResguardoTarget, Consigna } from "@/lib/types";
import { mapSqlToActivo } from "@/lib/mappers";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface NuevoResguardoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tipoActivo?: number; // 1 = Bienes Muebles, 2 = Enseres
}

export function NuevoResguardoWizard({
  open,
  onOpenChange,
  onSuccess,
  tipoActivo,
}: NuevoResguardoWizardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Paso 1: Selección de tipo y búsqueda
  const [targetType, setTargetType] = useState<"Empleado" | "Institucion">("Empleado");
  const [nomina, setNomina] = useState("");
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [consignas, setConsignas] = useState<Consigna[]>([]);
  const [selectedConsigna, setSelectedConsigna] = useState<string>("");
  const [target, setTarget] = useState<ResguardoTarget | null>(null);

  // Paso 2: Selección de activos
  const [activos, setActivos] = useState<Activo[]>([]);
  const [selectedActivos, setSelectedActivos] = useState<string[]>([]);

  const handleBuscarEmpleado = async () => {
    if (!nomina.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa una nómina",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await buscarEmpleado(nomina);
      if (!response.data) {
        toast({
          title: "No encontrado",
          description: "No se encontró un empleado con esa nómina",
          variant: "destructive",
        });
        return;
      }

      setEmpleado(response.data);
      setTarget({
        kind: "Empleado",
        id: response.data.nomina,
        display: `${response.data.nombre} (${response.data.nomina})`,
      });

      // Cargar activos disponibles filtrados por tipo si se especifica
      const activosResponse = await listActivos({ tipo: tipoActivo });
      const activosDisponibles = activosResponse.data.items.filter(
        (a: any) => a.estatus === "ACTIVO"
      );
      setActivos(activosDisponibles);
      setStep(2);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo buscar el empleado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadConsignas = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSelectInstitucion = async () => {
    if (!selectedConsigna) {
      toast({
        title: "Error",
        description: "Por favor selecciona una institución",
        variant: "destructive",
      });
      return;
    }

    const consigna = consignas.find(c => c.id.toString() === selectedConsigna);
    if (!consigna) return;

    setTarget({
      kind: "Institucion",
      id: consigna.id,
      display: consigna.nombre,
    });

    // Cargar activos disponibles filtrados por tipo si se especifica
    setLoading(true);
    try {
      const activosResponse = await listActivos({ tipo: tipoActivo });
      const activosDisponibles = activosResponse.data.items.filter(
        (a: any) => a.estatus === "ACTIVO"
      );
      setActivos(activosDisponibles);
      setStep(2);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los activos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinuarPaso1 = async () => {
    if (targetType === "Empleado") {
      await handleBuscarEmpleado();
    } else {
      if (consignas.length === 0) {
        await handleLoadConsignas();
      }
      if (selectedConsigna) {
        await handleSelectInstitucion();
      }
    }
  };

  const handleToggleActivo = (numeroInventario: string) => {
    setSelectedActivos((prev) =>
      prev.includes(numeroInventario)
        ? prev.filter((n) => n !== numeroInventario)
        : [...prev, numeroInventario]
    );
  };

  const handleCrearResguardo = async () => {
    if (!target || selectedActivos.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un artículo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const folio = `RS-${new Date().getFullYear()}-${String(
        Math.floor(Math.random() * 99999) + 1
      ).padStart(5, "0")}`;

      // Determinar qué enviar en el campo 'nomina'
      const nominaValue = target.kind === "Empleado" 
        ? target.id 
        : target.display.trim();

      await createResguardo({
        folio,
        nomina: nominaValue,
        numerosInventario: selectedActivos,
        idUsuario: user?.id ?? 0,
      });

      toast({
        title: "Éxito",
        description: `Resguardo ${folio} creado correctamente`,
      });

      handleClose();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el resguardo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setTargetType("Empleado");
    setNomina("");
    setEmpleado(null);
    setConsignas([]);
    setSelectedConsigna("");
    setTarget(null);
    setActivos([]);
    setSelectedActivos([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Resguardo</DialogTitle>
          <DialogDescription>
            Asigna activos a un empleado o institución - Paso {step} de 2
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Tipo de Destino</Label>
              <RadioGroup 
                value={targetType} 
                onValueChange={(v) => {
                  setTargetType(v as "Empleado" | "Institucion");
                  setEmpleado(null);
                  setNomina("");
                  setSelectedConsigna("");
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Empleado" id="tipo-empleado" />
                  <Label htmlFor="tipo-empleado" className="cursor-pointer font-normal flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Empleado
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Institucion" id="tipo-institucion" />
                  <Label htmlFor="tipo-institucion" className="cursor-pointer font-normal flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Institución (Comodato)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {targetType === "Empleado" && (
              <div className="space-y-2">
                <Label htmlFor="nomina">Nómina del Empleado</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="nomina"
                    placeholder="Ej: EMP001"
                    value={nomina}
                    onChange={(e) => setNomina(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleBuscarEmpleado();
                      }
                    }}
                  />
                  <Button onClick={handleBuscarEmpleado} disabled={loading} className="sm:w-auto">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
                {empleado && (
                  <div className="p-4 border rounded-md bg-muted/50">
                    <div className="font-medium">{empleado.nombre}</div>
                    <div className="text-sm text-muted-foreground">
                      {empleado.puesto} - {empleado.departamento}
                    </div>
                  </div>
                )}
              </div>
            )}

            {targetType === "Institucion" && (
              <div className="space-y-2">
                <Label htmlFor="institucion">Institución</Label>
                {consignas.length === 0 ? (
                  <Button onClick={handleLoadConsignas} disabled={loading} className="w-full">
                    <Building2 className="mr-2 h-4 w-4" />
                    Cargar Instituciones
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <SearchableSelect
                      options={consignas.map((c) => ({
                        value: c.id.toString(),
                        label: c.nombre,
                      }))}
                      value={selectedConsigna}
                      onValueChange={setSelectedConsigna}
                      placeholder="Selecciona una institución"
                      searchPlaceholder="Buscar institución…"
                      triggerClassName="flex-1"
                    />
                    <Button onClick={handleContinuarPaso1} disabled={loading || !selectedConsigna} className="sm:w-auto">
                      Continuar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && target && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Package className="h-5 w-5" />
              <span className="font-medium">Seleccionar Activos</span>
            </div>

            <div className="p-4 border rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                {target.kind === "Institucion" ? (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium">{target.display}</div>
                  <div className="text-sm text-muted-foreground">
                    {target.kind === "Institucion" ? "Institución en Comodato" : empleado?.departamento || "Empleado"}
                  </div>
                </div>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-md p-4">
              {activos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay activos disponibles
                </p>
              ) : (
                activos.map((activo) => (
                  <div
                    key={activo.id}
                    className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedActivos.includes(activo.numeroInventario)}
                      onCheckedChange={() => handleToggleActivo(activo.numeroInventario)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{activo.numeroInventario}</div>
                      <div className="text-sm text-muted-foreground">
                        {activo.descripcion}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {activo.clasificacionNombre}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedActivos.length} seleccionado
                  {selectedActivos.length !== 1 ? "s" : ""}
                </span>
                <Button onClick={handleCrearResguardo} disabled={loading} className="w-full sm:w-auto">
                  <FileText className="h-4 w-4 mr-2" />
                  {loading ? "Creando..." : "Crear Resguardo"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
