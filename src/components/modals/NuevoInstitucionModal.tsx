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
import { Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createInstitucion } from "@/lib/apiInstituciones";
import { institucionCreateSchema, type InstitucionCreateDto } from "@/lib/schemasInstituciones";

interface NuevoInstitucionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NuevoInstitucionModal({ open, onOpenChange, onSuccess }: NuevoInstitucionModalProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<InstitucionCreateDto>({
    resolver: zodResolver(institucionCreateSchema),
    defaultValues: { estatus: 1 },
  });

  const estatus = watch("estatus");

  useEffect(() => {
    if (!open) reset({ estatus: 1 });
  }, [open, reset]);

  const onSubmit = async (data: InstitucionCreateDto) => {
    try {
      await createInstitucion(data);
      toast({ title: "Institución creada", description: `Se creó la institución ${data.nombre} exitosamente` });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la institución",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Nueva Institución
          </DialogTitle>
          <DialogDescription>Registra una institución en comodato para asignar resguardos</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Institución *</Label>
            <Input id="nombre" placeholder="Ej: COMODATO DIF" {...register("nombre")} />
            {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Estatus *</Label>
            <Select
              value={estatus?.toString()}
              onValueChange={(val) => setValue("estatus", parseInt(val) as 1 | 0)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Activa</SelectItem>
                <SelectItem value="0">Inactiva</SelectItem>
              </SelectContent>
            </Select>
            {errors.estatus && <p className="text-sm text-destructive">{errors.estatus.message}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Crear Institución
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
