import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeftRight, 
  User, 
  Building2, 
  Search, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { buscarEmpleado, listConsignas, reasignarBien } from "@/lib/api";
import { Empleado, Consigna } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ActivoAsignado {
  id: string;
  numeroInventario: string;
  descripcion: string;
  marca?: string;
  modelo?: string;
}

interface ReasignarBienModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bien: ActivoAsignado | null;
  destinatarioActual: string;
  onSuccess: () => void;
}

export function ReasignarBienModal({
  open,
  onOpenChange,
  bien,
  destinatarioActual,
  onSuccess,
}: ReasignarBienModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Estados del formulario
  const [tipoDestino, setTipoDestino] = useState<"empleado" | "institucion">("empleado");
  const [nominaBuscada, setNominaBuscada] = useState("");
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<Empleado | null>(null);
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState<string>("");
  const [consignas, setConsignas] = useState<Consigna[]>([]);
  
  // Estados de carga
  const [buscandoEmpleado, setBuscandoEmpleado] = useState(false);
  const [loadingConsignas, setLoadingConsignas] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cargar consignas al abrir si es tipo institución
  useEffect(() => {
    if (open && tipoDestino === "institucion" && consignas.length === 0) {
      loadConsignas();
    }
  }, [open, tipoDestino]);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!open) {
      setTipoDestino("empleado");
      setNominaBuscada("");
      setEmpleadoEncontrado(null);
      setInstitucionSeleccionada("");
    }
  }, [open]);

  const loadConsignas = async () => {
    setLoadingConsignas(true);
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

  const handleBuscarEmpleado = async () => {
    if (!nominaBuscada.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un número de nómina",
        variant: "destructive",
      });
      return;
    }

    setBuscandoEmpleado(true);
    try {
      const response = await buscarEmpleado(nominaBuscada.trim());
      setEmpleadoEncontrado(response.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Empleado no encontrado",
        variant: "destructive",
      });
      setEmpleadoEncontrado(null);
    } finally {
      setBuscandoEmpleado(false);
    }
  };

  const getNuevoDestinatario = (): string | null => {
    if (tipoDestino === "empleado" && empleadoEncontrado) {
      return empleadoEncontrado.nomina;
    }
    if (tipoDestino === "institucion" && institucionSeleccionada) {
      const consigna = consignas.find(c => c.id.toString() === institucionSeleccionada);
      return consigna?.nombre || null;
    }
    return null;
  };

  const getNuevoDestinatarioDisplay = (): string => {
    if (tipoDestino === "empleado" && empleadoEncontrado) {
      return `${empleadoEncontrado.nombre} (${empleadoEncontrado.nomina})`;
    }
    if (tipoDestino === "institucion" && institucionSeleccionada) {
      const consigna = consignas.find(c => c.id.toString() === institucionSeleccionada);
      return consigna?.nombre || "";
    }
    return "";
  };

  const isDestinatarioValido = (): boolean => {
    const nuevoDestinatario = getNuevoDestinatario();
    if (!nuevoDestinatario) return false;
    // No permitir reasignar al mismo destino
    return nuevoDestinatario !== destinatarioActual;
  };

  const handleConfirmar = async () => {
    const nuevoDestinatario = getNuevoDestinatario();
    if (!nuevoDestinatario || !bien || !user) return;

    setGuardando(true);
    try {
      await reasignarBien(bien.numeroInventario, nuevoDestinatario, user.id);
      
      toast({
        title: "Reasignación exitosa",
        description: `El bien ${bien.numeroInventario} ha sido reasignado a ${getNuevoDestinatarioDisplay()}`,
      });
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo reasignar el bien",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  if (!bien) return null;

  const nuevoDestinatario = getNuevoDestinatario();
  const esDestinatarioIgual = nuevoDestinatario === destinatarioActual;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            Reasignar Bien
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Transfiere este bien a otro empleado o institución
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {/* Información del bien */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="font-mono text-xs">
                  {bien.numeroInventario}
                </Badge>
                <div className="flex-1">
                  <p className="font-medium">{bien.descripcion}</p>
                  {(bien.marca || bien.modelo) && (
                    <p className="text-sm text-muted-foreground">
                      {[bien.marca, bien.modelo].filter(Boolean).join(" - ")}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Actualmente asignado a: <strong>{destinatarioActual}</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tipo de destino */}
          <div className="space-y-3">
            <Label>Reasignar a:</Label>
            <RadioGroup
              value={tipoDestino}
              onValueChange={(value) => {
                setTipoDestino(value as "empleado" | "institucion");
                setEmpleadoEncontrado(null);
                setInstitucionSeleccionada("");
              }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="empleado" id="empleado" />
                <Label htmlFor="empleado" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Empleado
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="institucion" id="institucion" />
                <Label htmlFor="institucion" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4" />
                  Institución
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Buscar empleado */}
          {tipoDestino === "empleado" && (
            <div className="space-y-3">
              <Label>Número de nómina</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: 6021"
                  value={nominaBuscada}
                  onChange={(e) => setNominaBuscada(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarEmpleado()}
                />
                <Button
                  variant="outline"
                  onClick={handleBuscarEmpleado}
                  disabled={buscandoEmpleado}
                >
                  {buscandoEmpleado ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {empleadoEncontrado && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{empleadoEncontrado.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          Nómina: {empleadoEncontrado.nomina}
                          {empleadoEncontrado.departamento && ` • ${empleadoEncontrado.departamento}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Seleccionar institución */}
          {tipoDestino === "institucion" && (
            <div className="space-y-3">
              <Label>Institución</Label>
              <Select
                value={institucionSeleccionada}
                onValueChange={setInstitucionSeleccionada}
                disabled={loadingConsignas}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una institución..." />
                </SelectTrigger>
                <SelectContent>
                  {consignas.map((consigna) => (
                    <SelectItem key={consigna.id} value={consigna.id.toString()}>
                      {consigna.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Advertencia si es el mismo destino */}
          {esDestinatarioIgual && nuevoDestinatario && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                El bien ya está asignado a este destino
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!isDestinatarioValido() || guardando}
          >
            {guardando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Confirmar Reasignación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
