import { z } from "zod";

export const institucionCreateSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(150, "El nombre no puede exceder 150 caracteres")
    .trim(),
  estatus: z.union([z.literal(1), z.literal(0)], {
    errorMap: () => ({ message: "El estatus debe ser Activa o Inactiva" }),
  }),
});

export const institucionUpdateSchema = z.object({
  id: z.number().int().positive(),
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(150, "El nombre no puede exceder 150 caracteres")
    .trim(),
  estatus: z.union([z.literal(1), z.literal(0)]),
});

export type InstitucionCreateDto = z.infer<typeof institucionCreateSchema>;
export type InstitucionUpdateDto = z.infer<typeof institucionUpdateSchema>;
