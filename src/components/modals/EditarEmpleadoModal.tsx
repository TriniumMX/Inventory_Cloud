import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateEmpleado } from "@/lib/employees";
import { empleadoUpdateSchema, type EmpleadoUpdateDto } from "@/lib/schemasEmpleados";
import type { Empleado } from "@/lib/types";

interface EditarEmpleadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleado: Empleado | null;
  onSuccess: () => void;
}

export function EditarEmpleadoModal({ open, onOpenChange, empleado, onSuccess }: EditarEmpleadoModalProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<EmpleadoUpdateDto>({
    resolver: zodResolver(empleadoUpdateSchema),
  });

  const activo = watch("activo");

  useEffect(() => {
    if (empleado) {
      setValue("nomina", empleado.nomina);
      setValue("nombre", empleado.nombre);
      setValue("departamento", empleado.departamento || "");
      setValue("puesto", empleado.puesto || "");
      setValue("activo", (empleado.activo as "A" | "B") || "A");
    }
  }, [empleado, setValue]);

  const onSubmit = async (data: EmpleadoUpdateDto) => {
    if (!empleado) return;
    try {
      await updateEmpleado(empleado.nomina, data);
      toast({ title: "Empleado actualizado", description: `Se actualizó el empleado ${data.nombre} exitosamente` });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el empleado",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Empleado</DialogTitle>
          <DialogDescription>Modifica los datos del empleado</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nomina">Nómina</Label>
            <Input id="nomina" disabled {...register("nomina")} />
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

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Actualizar Empleado
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
