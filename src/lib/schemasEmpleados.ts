import { z } from "zod";

export const empleadoCreateSchema = z.object({
  nomina: z
    .string()
    .min(1, "La nómina es requerida")
    .max(20, "La nómina no puede exceder 20 caracteres")
    .trim()
    .regex(/^[a-zA-Z0-9-]+$/, "Solo letras, números y guiones"),
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(150, "El nombre no puede exceder 150 caracteres")
    .trim(),
  departamento: z.string().max(100, "Máximo 100 caracteres").trim().optional().or(z.literal("")),
  puesto: z.string().max(100, "Máximo 100 caracteres").trim().optional().or(z.literal("")),
  activo: z.union([z.literal("A"), z.literal("B")], {
    errorMap: () => ({ message: "El estatus debe ser Activo o Baja" }),
  }),
});

export const empleadoUpdateSchema = z.object({
  nomina: z.string().min(1),
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(150, "El nombre no puede exceder 150 caracteres")
    .trim(),
  departamento: z.string().max(100, "Máximo 100 caracteres").trim().optional().or(z.literal("")),
  puesto: z.string().max(100, "Máximo 100 caracteres").trim().optional().or(z.literal("")),
  activo: z.union([z.literal("A"), z.literal("B")]),
});

export type EmpleadoCreateDto = z.infer<typeof empleadoCreateSchema>;
export type EmpleadoUpdateDto = z.infer<typeof empleadoUpdateSchema>;
