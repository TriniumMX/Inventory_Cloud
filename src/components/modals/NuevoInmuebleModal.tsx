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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Building2,
  MapPin,
  FileText,
  DollarSign,
  Hash,
  AlignLeft,
  Layers,
  Navigation,
  Ruler,
  BookOpen,
  Archive,
  TrendingUp,
  User,
  Search,
  Loader2,
  CheckCircle2,
  Save,
} from "lucide-react";
import { bienInmuebleCreateSchema, BienInmuebleCreateData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { TipoInmueble, CuentaContable, Empleado } from "@/lib/types";
import { createBienInmueble, checkNumeroInventarioInmuebleExists } from "@/lib/api";
import { getEmployeeByNomina } from "@/lib/employees";

interface NuevoInmuebleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiposInmueble: TipoInmueble[];
  cuentasContables: CuentaContable[];
  empleados: Empleado[];
  onSuccess: () => void;
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

export function NuevoInmuebleModal({
  open,
  onOpenChange,
  tiposInmueble,
  cuentasContables,
  empleados,
  onSuccess,
}: NuevoInmuebleModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [nominaBusqueda, setNominaBusqueda] = useState("");
  const [buscandoResponsable, setBuscandoResponsable] = useState(false);
  const [responsableEncontrado, setResponsableEncontrado] = useState<Empleado | null>(null);

  const handleBuscarResponsable = async () => {
    if (!nominaBusqueda.trim()) return;
    setBuscandoResponsable(true);
    setResponsableEncontrado(null);
    try {
      const emp = await getEmployeeByNomina(nominaBusqueda.trim());
      if (emp) {
        setResponsableEncontrado(emp);
        form.setValue("responsableNomina", emp.nomina);
      } else {
        toast({
          title: "No encontrado",
          description: `No existe empleado con nómina ${nominaBusqueda}`,
          variant: "destructive",
        });
        form.setValue("responsableNomina", "");
      }
    } catch {
      toast({ title: "Error", description: "No se pudo buscar el empleado", variant: "destructive" });
      form.setValue("responsableNomina", "");
    } finally {
      setBuscandoResponsable(false);
    }
  };

  const form = useForm<BienInmuebleCreateData>({
    resolver: zodResolver(bienInmuebleCreateSchema),
    defaultValues: {
      numeroInventario: "",
      direccion: "",
      idTipoInmueble: "",
      estatus: "1",
      nombre: "",
      descripcion: "",
      usoActual: "",
      niveles: "",
      colonia: "",
      codigoPostal: "",
      municipio: "San Juan del Río",
      estado: "Querétaro",
      latitud: "",
      longitud: "",
      superficieTerreno: "",
      superficieConstruccion: "",
      numeroEscritura: "",
      fechaEscritura: "",
      notaria: "",
      volumenLibro: "",
      folioRegistro: "",
      claveCatastral: "",
      valorCatastral: "",
      valorComercial: "",
      costoAdquisicion: "",
      fechaAdquisicion: "",
      idCuentaContable: "",
      responsableNomina: "",
      observaciones: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      setActiveTab("general");
      setNominaBusqueda("");
      setResponsableEncontrado(null);
      setTimeout(() => {
        const firstInput = document.querySelector<HTMLInputElement>('[name="numeroInventario"]');
        firstInput?.focus();
      }, 100);
    }
  }, [open, form]);

  const onSubmit = async (data: BienInmuebleCreateData) => {
    setIsSubmitting(true);
    try {
      const exists = await checkNumeroInventarioInmuebleExists(data.numeroInventario!);
      if (exists) {
        toast({
          title: "Número de inventario duplicado",
          description: `El número ${data.numeroInventario} ya está registrado`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      await createBienInmueble({
        numeroInventario: data.numeroInventario!,
        direccion: data.direccion!,
        idTipoInmueble: data.idTipoInmueble!,
        estatus: data.estatus!,
        nombre: data.nombre,
        descripcion: data.descripcion,
        usoActual: data.usoActual,
        niveles: data.niveles,
        colonia: data.colonia,
        codigoPostal: data.codigoPostal,
        municipio: data.municipio,
        estado: data.estado,
        latitud: data.latitud,
        longitud: data.longitud,
        superficieTerreno: data.superficieTerreno,
        superficieConstruccion: data.superficieConstruccion,
        numeroEscritura: data.numeroEscritura,
        fechaEscritura: data.fechaEscritura,
        notaria: data.notaria,
        volumenLibro: data.volumenLibro,
        folioRegistro: data.folioRegistro,
        claveCatastral: data.claveCatastral,
        valorCatastral: data.valorCatastral,
        valorComercial: data.valorComercial,
        costoAdquisicion: data.costoAdquisicion,
        fechaAdquisicion: data.fechaAdquisicion,
        idCuentaContable: data.idCuentaContable,
        responsableNomina: data.responsableNomina,
        observaciones: data.observaciones,
      });

      toast({
        title: "Inmueble registrado",
        description: `Se ha registrado el inmueble ${data.numeroInventario}`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el inmueble",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* flex flex-col + max-h so header/tabs/footer stay fixed; only content scrolls */}
      <DialogContent className="w-[95vw] max-w-4xl flex flex-col max-h-[90vh] p-0 gap-0">
        {/* Header — never scrolls */}
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-4 pr-12 sm:pr-14 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 flex-shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Nuevo Bien Inmueble
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5">
                Registra un nuevo bien inmueble en el patrimonio municipal.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
              {/* Tab list — never scrolls */}
              <div className="flex-shrink-0 px-4 sm:px-6 pt-4 pb-1">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                  <TabsTrigger
                    value="general"
                    className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 py-2 sm:py-1.5"
                  >
                    <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium">General</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="ubicacion"
                    className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 py-2 sm:py-1.5"
                  >
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium">Ubicación</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="legal"
                    className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 py-2 sm:py-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium">Docs.</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="valores"
                    className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 py-2 sm:py-1.5"
                  >
                    <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium">Valores</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                {/* Tab 1: Datos Generales */}
                <TabsContent value="general" className="space-y-3 mt-0" forceMount hidden={activeTab !== "general"}>
                  <SectionCard icon={Hash} title="Identificación">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="numeroInventario"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Inventario *</FormLabel>
                            <FormControl>
                              <Input placeholder="INM-2024-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="idTipoInmueble"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Inmueble *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {tiposInmueble.map((t) => (
                                  <SelectItem key={t.id} value={String(t.id)}>
                                    {t.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </SectionCard>

                  <SectionCard icon={AlignLeft} title="Descripción">
                    <FormField
                      control={form.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Inmueble</FormLabel>
                          <FormControl>
                            <Input placeholder="Edificio Presidencia Municipal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="descripcion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descripción detallada del inmueble..."
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

                  <SectionCard icon={Layers} title="Características">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="usoActual"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Uso Actual</FormLabel>
                            <FormControl>
                              <Input placeholder="Oficinas administrativas" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="niveles"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Niveles</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" placeholder="2" {...field} />
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
                                <SelectItem value="1">Activo</SelectItem>
                                <SelectItem value="0">Baja</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </SectionCard>
                </TabsContent>

                {/* Tab 2: Ubicación */}
                <TabsContent value="ubicacion" className="space-y-3 mt-0" forceMount hidden={activeTab !== "ubicacion"}>
                  <SectionCard icon={MapPin} title="Dirección">
                    <FormField
                      control={form.control}
                      name="direccion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección *</FormLabel>
                          <FormControl>
                            <Input placeholder="Av. Juárez #123, Centro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="colonia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Colonia</FormLabel>
                            <FormControl>
                              <Input placeholder="Centro Histórico" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="codigoPostal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código Postal</FormLabel>
                            <FormControl>
                              <Input placeholder="76800" maxLength={5} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="municipio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Municipio</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="estado"
                      render={({ field }) => (
                        <FormItem className="sm:max-w-[200px]">
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SectionCard>

                  <SectionCard icon={Navigation} title="Coordenadas GPS">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="latitud"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitud</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.000001" placeholder="20.3881" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="longitud"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitud</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.000001" placeholder="-99.9961" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </SectionCard>

                  <SectionCard icon={Ruler} title="Superficies">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="superficieTerreno"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Terreno (m²)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="500.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="superficieConstruccion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Construcción (m²)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="350.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </SectionCard>
                </TabsContent>

                {/* Tab 3: Documentación Legal */}
                <TabsContent value="legal" className="space-y-3 mt-0" forceMount hidden={activeTab !== "legal"}>
                  <SectionCard icon={BookOpen} title="Datos de Escritura">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="numeroEscritura"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Escritura</FormLabel>
                            <FormControl>
                              <Input placeholder="12345" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fechaEscritura"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de Escritura</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="notaria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notaría</FormLabel>
                          <FormControl>
                            <Input placeholder="Notaría Pública No. 5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SectionCard>

                  <SectionCard icon={Archive} title="Registro Público">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="volumenLibro"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Volumen / Libro</FormLabel>
                            <FormControl>
                              <Input placeholder="Vol. 123, Libro 45" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="folioRegistro"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Folio de Registro Público</FormLabel>
                            <FormControl>
                              <Input placeholder="F-2024-001234" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="claveCatastral"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clave Catastral</FormLabel>
                          <FormControl>
                            <Input placeholder="22-016-001-001-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SectionCard>

                  <div className="rounded-lg border border-dashed bg-muted/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Archivo de Escritura (PDF)</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Podrás subir el archivo PDF de la escritura después de guardar el inmueble.
                          Edita el registro una vez creado para agregar el documento.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 4: Valores y Responsable */}
                <TabsContent value="valores" className="space-y-3 mt-0" forceMount hidden={activeTab !== "valores"}>
                  <SectionCard icon={TrendingUp} title="Valuación y Adquisición">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="valorCatastral"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Catastral</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="valorComercial"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Comercial</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="costoAdquisicion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Costo de Adquisición</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="fechaAdquisicion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de Adquisición</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="idCuentaContable"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cuenta Contable</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona cuenta" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(cuentasContables || []).map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.ctaContable} — {c.descripcion}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </SectionCard>

                  <SectionCard icon={User} title="Responsable">
                    <FormField
                      control={form.control}
                      name="responsableNomina"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buscar por número de nómina</FormLabel>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Ej: 6979"
                                value={nominaBusqueda}
                                onChange={(e) => setNominaBusqueda(e.target.value)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && (e.preventDefault(), handleBuscarResponsable())
                                }
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={handleBuscarResponsable}
                                disabled={buscandoResponsable || !nominaBusqueda.trim()}
                                className="flex-shrink-0 min-w-[44px]"
                              >
                                {buscandoResponsable ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Search className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {responsableEncontrado && (
                              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {responsableEncontrado.nombre}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Nómina: {responsableEncontrado.nomina}
                                    {responsableEncontrado.departamento &&
                                      ` • ${responsableEncontrado.departamento}`}
                                  </p>
                                </div>
                                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              </div>
                            )}
                            <input type="hidden" {...field} />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SectionCard>

                  <SectionCard icon={AlignLeft} title="Observaciones">
                    <FormField
                      control={form.control}
                      name="observaciones"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Notas adicionales sobre el inmueble..."
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
                </TabsContent>
              </div>
            </Tabs>

            {/* Footer — never scrolls */}
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
                    Guardar Inmueble
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
