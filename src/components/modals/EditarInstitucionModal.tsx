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
import { updateInstitucion, type Institucion } from "@/lib/apiInstituciones";
import { institucionUpdateSchema, type InstitucionUpdateDto } from "@/lib/schemasInstituciones";

interface EditarInstitucionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institucion: Institucion | null;
  onSuccess: () => void;
}

export function EditarInstitucionModal({ open, onOpenChange, institucion, onSuccess }: EditarInstitucionModalProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<InstitucionUpdateDto>({
    resolver: zodResolver(institucionUpdateSchema),
  });

  const estatus = watch("estatus");

  useEffect(() => {
    if (institucion) {
      setValue("id", institucion.id);
      setValue("nombre", institucion.nombre);
      setValue("estatus", institucion.estatus);
    }
  }, [institucion, setValue]);

  const onSubmit = async (data: InstitucionUpdateDto) => {
    if (!institucion) return;
    try {
      await updateInstitucion(institucion.id, data);
      toast({ title: "Institución actualizada", description: `Se actualizó ${data.nombre} exitosamente` });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar la institución",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Institución</DialogTitle>
          <DialogDescription>Modifica los datos de la institución</DialogDescription>
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

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Actualizar Institución
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
