import { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  User, 
  Search, 
  Loader2,
  ArrowRight,
  Package,
  CheckCircle2
} from "lucide-react";
import { buscarEmpleado, traspasarInventarioCompleto } from "@/lib/api";
import { Empleado } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ActivoAsignado {
  id: string;
  numeroInventario: string;
  descripcion: string;
  marca?: string;
  modelo?: string;
}

interface TraspasoMasivoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleadoBaja: Empleado | null;
  bienesAsignados: ActivoAsignado[];
  onSuccess: () => void;
  onSoloConsultar: () => void;
}

export function TraspasoMasivoModal({
  open,
  onOpenChange,
  empleadoBaja,
  bienesAsignados,
  onSuccess,
  onSoloConsultar,
}: TraspasoMasivoModalProps) {
  const { toast } = useToast();
  const { user, canEdit } = useAuth();
  const puedeEditar = canEdit("resguardos");

  // Estados del formulario
  const [nominaDestino, setNominaDestino] = useState("");
  const [empleadoDestino, setEmpleadoDestino] = useState<Empleado | null>(null);
  
  // Estados de carga
  const [buscandoEmpleado, setBuscandoEmpleado] = useState(false);
  const [traspasando, setTraspasando] = useState(false);
  const [traspasoExitoso, setTraspasoExitoso] = useState(false);

  // Limpiar estado al cerrar
  const handleClose = () => {
    setNominaDestino("");
    setEmpleadoDestino(null);
    setTraspasoExitoso(false);
    onOpenChange(false);
  };

  const handleBuscarEmpleado = async () => {
    if (!nominaDestino.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un número de nómina",
        variant: "destructive",
      });
      return;
    }

    setBuscandoEmpleado(true);
    try {
      const response = await buscarEmpleado(nominaDestino.trim());
      
      // Verificar que el empleado destino esté activo
      if (response.data.activo === "B") {
        toast({
          title: "Empleado no válido",
          description: "El empleado destino también está dado de BAJA. Seleccione un empleado activo.",
          variant: "destructive",
        });
        setEmpleadoDestino(null);
        return;
      }

      // Verificar que no sea el mismo empleado
      if (response.data.nomina === empleadoBaja?.nomina) {
        toast({
          title: "Error",
          description: "No puede traspasar bienes al mismo empleado",
          variant: "destructive",
        });
        setEmpleadoDestino(null);
        return;
      }

      setEmpleadoDestino(response.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Empleado no encontrado",
        variant: "destructive",
      });
      setEmpleadoDestino(null);
    } finally {
      setBuscandoEmpleado(false);
    }
  };

  const handleTraspasar = async () => {
    if (!empleadoBaja || !empleadoDestino || !user) return;

    setTraspasando(true);
    try {
      const result = await traspasarInventarioCompleto(
        empleadoBaja.nomina,
        empleadoDestino.nomina,
        user.id
      );

      setTraspasoExitoso(true);
      
      toast({
        title: "Traspaso exitoso",
        description: `Se transfirieron ${result.data.transferidos} bienes a ${empleadoDestino.nombre}`,
      });

      // Esperar un momento para mostrar el estado de éxito
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo realizar el traspaso",
        variant: "destructive",
      });
    } finally {
      setTraspasando(false);
    }
  };

  const handleSoloConsultar = () => {
    handleClose();
    onSoloConsultar();
  };

  if (!empleadoBaja) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Empleado Dado de Baja
          </DialogTitle>
          <DialogDescription>
            Este empleado ya no está activo en la organización
          </DialogDescription>
        </DialogHeader>

        {traspasoExitoso ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-600">¡Traspaso Completado!</h3>
              <p className="text-muted-foreground">
                Los bienes han sido transferidos exitosamente
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Alerta de empleado dado de baja */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Empleado con estatus BAJA</AlertTitle>
              <AlertDescription>
                <strong>{empleadoBaja.nombre}</strong> (Nómina: {empleadoBaja.nomina}) 
                está dado de baja y tiene <strong>{bienesAsignados.length} bienes</strong> asignados a su resguardo.
              </AlertDescription>
            </Alert>

            {/* Resumen de bienes */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{bienesAsignados.length} bienes asignados</p>
                    <p className="text-sm text-muted-foreground">
                      Estos bienes deben ser transferidos a otro empleado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sección de traspaso */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Traspasar a:</Label>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Número de nómina del nuevo responsable"
                  value={nominaDestino}
                  onChange={(e) => setNominaDestino(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarEmpleado()}
                />
                <Button
                  variant="outline"
                  onClick={handleBuscarEmpleado}
                  disabled={buscandoEmpleado}
                  className="sm:w-auto"
                >
                  {buscandoEmpleado ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {empleadoDestino && (
                <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{empleadoDestino.nombre}</p>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            ACTIVO
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Nómina: {empleadoDestino.nomina}
                          {empleadoDestino.departamento && ` • ${empleadoDestino.departamento}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {!traspasoExitoso && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleSoloConsultar}
              className="sm:flex-1"
            >
              Solo Consultar
            </Button>
            {puedeEditar && (
              <Button
                onClick={handleTraspasar}
                disabled={!empleadoDestino || traspasando}
                className="sm:flex-1"
              >
                {traspasando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Traspasando...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Traspasar Todo ({bienesAsignados.length} bienes)
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
