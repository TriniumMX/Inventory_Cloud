import { z } from "zod";

export const usuarioCreateSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .trim(),
  usuario: z
    .string()
    .min(1, "El usuario es requerido")
    .max(50, "El usuario no puede exceder 50 caracteres")
    .trim()
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guiones bajos"),
  password: z
    .string()
    .min(1, "La contraseña es requerida"),
  permisos: z.union([z.literal(1), z.literal(2), z.literal(3)], {
    errorMap: () => ({ message: "Permisos debe ser 1, 2 o 3" }),
  }),
});

export const usuarioUpdateSchema = z.object({
  id: z.number().int().positive(),
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .trim(),
  usuario: z
    .string()
    .min(1, "El usuario es requerido")
    .max(50, "El usuario no puede exceder 50 caracteres")
    .trim()
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guiones bajos"),
  password: z
    .string()
    .optional()
    .or(z.literal("")),
  permisos: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export type UsuarioCreateDto = z.infer<typeof usuarioCreateSchema>;
export type UsuarioUpdateDto = z.infer<typeof usuarioUpdateSchema>;
