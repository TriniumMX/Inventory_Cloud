import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createEmpleado } from "@/lib/employees";
import { empleadoCreateSchema, type EmpleadoCreateDto } from "@/lib/schemasEmpleados";

interface NuevoEmpleadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NuevoEmpleadoModal({ open, onOpenChange, onSuccess }: NuevoEmpleadoModalProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<EmpleadoCreateDto>({
    resolver: zodResolver(empleadoCreateSchema),
    defaultValues: { activo: "A" },
  });

  const activo = watch("activo");

  useEffect(() => {
    if (!open) reset({ activo: "A" });
  }, [open, reset]);

  const onSubmit = async (data: EmpleadoCreateDto) => {
    try {
      await createEmpleado(data);
      toast({ title: "Empleado creado", description: `Se creó el empleado ${data.nombre} exitosamente` });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el empleado",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nuevo Empleado
          </DialogTitle>
          <DialogDescription>Registra un nuevo empleado en el sistema</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nomina">Nómina *</Label>
            <Input id="nomina" placeholder="Ej: 6021" {...register("nomina")} />
            {errors.nomina && <p className="text-sm text-destructive">{errors.nomina.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre Completo *</Label>
            <Input id="nombre" placeholder="Ej: Juan Pérez López" {...register("nombre")} />
            {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="departamento">Departamento</Label>
            <Input id="departamento" placeholder="Ej: Tesorería" {...register("departamento")} />
            {errors.departamento && <p className="text-sm text-destructive">{errors.departamento.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="puesto">Puesto</Label>
            <Input id="puesto" placeholder="Ej: Auxiliar Contable" {...register("puesto")} />
            {errors.puesto && <p className="text-sm text-destructive">{errors.puesto.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Estatus *</Label>
            <Select value={activo} onValueChange={(val) => setValue("activo", val as "A" | "B")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Activo</SelectItem>
                <SelectItem value="B">Baja</SelectItem>
              </SelectContent>
            </Select>
            {errors.activo && <p className="text-sm text-destructive">{errors.activo.message}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Crear Empleado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
