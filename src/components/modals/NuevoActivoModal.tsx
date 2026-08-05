import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Package,
  Hash,
  Cpu,
  Receipt,
  Tags,
  AlignLeft,
  Loader2,
  Save,
} from "lucide-react";
import { activoCreateSchema, ActivoCreateData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { Clasificacion, CuentaContable } from "@/lib/types";
import { createActivo, checkNumeroInventarioExists } from "@/lib/api";
import { ClasificacionCombobox } from "@/components/shared/ClasificacionCombobox";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { CurrencyInput } from "@/components/shared/CurrencyInput";

interface NuevoActivoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clasificaciones: Clasificacion[];
  cuentasContables: CuentaContable[];
  onSuccess: () => void;
  tipo?: number; // 1 = Bien Mueble, 2 = Enser
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-border/50">
        <Icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export function NuevoActivoModal({
  open,
  onOpenChange,
  clasificaciones,
  cuentasContables,
  onSuccess,
  tipo = 1,
}: NuevoActivoModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tipoNombre = tipo === 2 ? "Enser" : "Activo";
  const tipoLabel = tipo === 2 ? "enser" : "activo";

  const form = useForm<ActivoCreateData>({
    resolver: zodResolver(activoCreateSchema),
    defaultValues: {
      numeroInventario: "",
      descripcion: "",
      marca: "",
      modelo: "",
      numeroSerie: "",
      folioFactura: "",
      fechaFactura: "",
      fechaAlta: new Date().toISOString().split("T")[0],
      clasificacion: "",
      estatus: "ACTIVO",
      idCuentaContable: "",
      costo: "",
      observaciones: "",
    },
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const firstInput = document.querySelector<HTMLInputElement>('[name="numeroInventario"]');
        firstInput?.focus();
      }, 100);
    }
  }, [open]);

  const onSubmit = async (data: ActivoCreateData) => {
    setIsSubmitting(true);
    try {
      const exists = await checkNumeroInventarioExists(data.numeroInventario);
      if (exists) {
        toast({
          title: "Número de inventario duplicado",
          description: `El número de inventario ${data.numeroInventario} ya está registrado`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      await createActivo({ ...data, tipo });

      toast({
        title: `${tipoNombre} guardado`,
        description: `Se ha registrado el ${tipoLabel} ${data.numeroInventario}`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo guardar el ${tipoLabel}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl flex flex-col max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-4 pr-12 sm:pr-14 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 flex-shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                {tipo === 2 ? "Nuevo Enser" : "Nuevo Activo"}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5">
                {tipo === 2
                  ? "Registra un nuevo enser en el inventario."
                  : "Registra un nuevo bien mueble en el inventario."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
              <SectionCard icon={Hash} title="Identificación">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="numeroInventario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Inventario *</FormLabel>
                        <FormControl>
                          <Input placeholder="MOB-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="costo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Costo *</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value === 0 ? "" : field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={AlignLeft} title="Descripción">
                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción *</FormLabel>
                      <FormControl>
                        <Input placeholder="Escritorio ejecutivo de madera" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SectionCard>

              <SectionCard icon={Cpu} title="Datos Técnicos">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="marca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <FormControl>
                          <Input placeholder="HP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="modelo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo</FormLabel>
                        <FormControl>
                          <Input placeholder="ProDesk 600" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numeroSerie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Serie</FormLabel>
                        <FormControl>
                          <Input placeholder="SN-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={Receipt} title="Facturación">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="folioFactura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Folio de Factura</FormLabel>
                        <FormControl>
                          <Input placeholder="FAC-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fechaFactura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Factura</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fechaAlta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Alta</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={Tags} title="Clasificación y Estado">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="clasificacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clasificación *</FormLabel>
                        <FormControl>
                          <ClasificacionCombobox
                            clasificaciones={clasificaciones}
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estatus *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVO">Activo</SelectItem>
                            <SelectItem value="ALMACEN">En Almacen</SelectItem>
                            <SelectItem value="BAJA">Baja</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="idCuentaContable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cuenta Contable *</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={cuentasContables.map((c) => ({
                              value: c.id,
                              label: c.descripcion,
                              sublabel: c.ctaContable,
                              keywords: c.ctaContable,
                            }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Selecciona"
                            searchPlaceholder="Buscar cuenta contable…"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={AlignLeft} title="Observaciones">
                <FormField
                  control={form.control}
                  name="observaciones"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Notas adicionales sobre el activo..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SectionCard>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/30 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar {tipoNombre}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
