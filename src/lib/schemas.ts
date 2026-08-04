import { z } from "zod";

// Schema para crear activo
export const activoCreateSchema = z.object({
  numeroInventario: z
    .string()
    .trim()
    .min(1, { message: "El número de inventario es requerido" })
    .max(50, { message: "Máximo 50 caracteres" }),
  descripcion: z
    .string()
    .trim()
    .min(1, { message: "La descripción es requerida" })
    .max(200, { message: "Máximo 200 caracteres" }),
  marca: z.string().trim().max(100).optional().or(z.literal("")),
  modelo: z.string().trim().max(100).optional().or(z.literal("")),
  numeroSerie: z.string().trim().max(100).optional().or(z.literal("")),
  folioFactura: z.string().trim().max(100).optional().or(z.literal("")),
  fechaFactura: z.string().optional().or(z.literal("")),
  fechaAlta: z.string().optional().or(z.literal("")),
  clasificacion: z.string().min(1, { message: "La clasificación es requerida" }),
  estatus: z.string().min(1, { message: "El estatus es requerido" }),
  idCuentaContable: z.string().min(1, { message: "La cuenta contable es requerida" }),
  costo: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === "string") {
        if (val === "") return 0;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      }
      return val;
    })
    .pipe(z.number().min(0, { message: "El costo debe ser mayor o igual a 0" })),
  observaciones: z.string().trim().max(500).optional().or(z.literal("")),
  tipo: z.number().optional().default(1),
});

// Schema para actualizar activo
export const activoUpdateSchema = activoCreateSchema.partial().required({
  descripcion: true,
});

export type ActivoCreateData = z.input<typeof activoCreateSchema>;
export type ActivoUpdateData = z.input<typeof activoUpdateSchema>;

// Schema para crear bien inmueble
export const bienInmuebleCreateSchema = z.object({
  // Requeridos
  numeroInventario: z
    .string()
    .trim()
    .min(1, { message: "El número de inventario es requerido" })
    .max(50, { message: "Máximo 50 caracteres" }),
  direccion: z
    .string()
    .trim()
    .min(1, { message: "La dirección es requerida" })
    .max(500, { message: "Máximo 500 caracteres" }),
  idTipoInmueble: z.string().min(1, { message: "El tipo de inmueble es requerido" }),
  estatus: z.string().default("1"),

  // Requeridos adicionales
  nombre: z
    .string()
    .trim()
    .min(1, { message: "El nombre del inmueble es requerido" })
    .max(200, { message: "Máximo 200 caracteres" }),
  descripcion: z
    .string()
    .trim()
    .min(1, { message: "La descripción es requerida" })
    .max(1000, { message: "Máximo 1000 caracteres" }),
  usoActual: z.string().trim().max(200).optional().or(z.literal("")),
  niveles: z.string().optional().or(z.literal("")),
  colonia: z.string().trim().max(200).optional().or(z.literal("")),
  codigoPostal: z.string().trim().max(10).optional().or(z.literal("")),
  municipio: z.string().trim().max(100).default(""),
  estado: z.string().trim().max(100).default(""),
  latitud: z.string().optional().or(z.literal("")),
  longitud: z.string().optional().or(z.literal("")),
  superficieTerreno: z.string().optional().or(z.literal("")),
  superficieConstruccion: z.string().optional().or(z.literal("")),
  numeroEscritura: z.string().trim().max(100).optional().or(z.literal("")),
  fechaEscritura: z.string().optional().or(z.literal("")),
  notaria: z.string().trim().max(200).optional().or(z.literal("")),
  volumenLibro: z.string().trim().max(100).optional().or(z.literal("")),
  folioRegistro: z.string().trim().max(100).optional().or(z.literal("")),
  claveCatastral: z.string().trim().max(100).optional().or(z.literal("")),
  valorCatastral: z.string().optional().or(z.literal("")),
  valorComercial: z.string().optional().or(z.literal("")),
  costoAdquisicion: z.string().optional().or(z.literal("")),
  fechaAdquisicion: z.string().optional().or(z.literal("")),
  idCuentaContable: z.string().optional().or(z.literal("")),
  responsableNomina: z.string().optional().or(z.literal("")),
  observaciones: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type BienInmuebleCreateData = z.input<typeof bienInmuebleCreateSchema>;

// Schema para actualizar bien inmueble
export const bienInmuebleUpdateSchema = bienInmuebleCreateSchema.partial().required({
  numeroInventario: true,
  direccion: true,
  idTipoInmueble: true,
});

export type BienInmuebleUpdateData = z.input<typeof bienInmuebleUpdateSchema>;
