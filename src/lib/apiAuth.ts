import bcrypt from "bcryptjs";
import type { UsuarioAuth } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface LoginCredentials {
  usuario: string;
  password: string;
}

interface LoginResponse {
  id: number;
  nombre: string;
  usuario: string;
  permisos: 1 | 2 | 3;
  modulosPermitidos?: { clave: string; puedeEditar: boolean }[];
  token?: string;
  error?: string;
}

export async function login(credentials: LoginCredentials): Promise<{ user: UsuarioAuth }> {
  const { data, error } = await supabase.functions.invoke<LoginResponse>("auth-login", {
    body: credentials,
  });

  if (error || !data || data.error) {
    throw new Error(data?.error || "Usuario o contraseña incorrectos");
  }

  const user: UsuarioAuth = {
    id: data.id,
    nombre: data.nombre,
    usuario: data.usuario,
    permisos: data.permisos,
    token: data.token,
    modulosPermitidos: data.modulosPermitidos ?? [],
  };

  return { user };
}

export async function me(): Promise<UsuarioAuth | null> {
  const stored = localStorage.getItem("auth:user");
  if (!stored) return null;

  try {
    const user = JSON.parse(stored) as UsuarioAuth;
    if (!user.token) return null;

    const { data, error } = await supabase.functions.invoke<LoginResponse>("auth-me", {
      headers: { Authorization: `Bearer ${user.token}` },
    });

    if (error || !data || data.error) {
      localStorage.removeItem("auth:user");
      return null;
    }

    return {
      id: data.id,
      nombre: data.nombre,
      usuario: data.usuario,
      permisos: data.permisos,
      token: user.token,
      modulosPermitidos: data.modulosPermitidos ?? [],
    };
  } catch {
    localStorage.removeItem("auth:user");
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem("auth:user");
}

export function evaluarSeguridadPassword(password: string): { nivel: "debil" | "media" | "fuerte"; mensaje: string } {
  if (password.length < 8) return { nivel: "debil", mensaje: "Muy corta" };

  const tieneMinuscula = /[a-z]/.test(password);
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneNumero = /\d/.test(password);
  const tieneEspecial = /[@$!%*#?&]/.test(password);
  const puntuacion = [tieneMinuscula, tieneMayuscula, tieneNumero, tieneEspecial].filter(Boolean).length;

  if (puntuacion <= 2) return { nivel: "debil", mensaje: "Débil" };
  if (puntuacion === 3) return { nivel: "media", mensaje: "Media" };
  return { nivel: "fuerte", mensaje: "Fuerte" };
}

export async function changePassword(passwordActual: string, passwordNueva: string): Promise<{ message: string }> {
  const stored = localStorage.getItem("auth:user");
  if (!stored) throw new Error("No autenticado");
  const user = JSON.parse(stored) as UsuarioAuth;

  const { data: row, error: fetchError } = await supabase
    .from("usuarios")
    .select("password_hash, password")
    .eq("id_usuario", user.id)
    .maybeSingle();

  if (fetchError || !row) throw new Error("Usuario no encontrado");

  const valid = row.password_hash
    ? await bcrypt.compare(passwordActual, row.password_hash)
    : row.password === passwordActual;

  if (!valid) throw new Error("La contraseña actual es incorrecta");

  const newHash = await bcrypt.hash(passwordNueva, 10);
  const { error: updateError } = await supabase
    .from("usuarios")
    .update({ password_hash: newHash, password: null })
    .eq("id_usuario", user.id);

  if (updateError) throw new Error("Error al actualizar la contraseña");

  return { message: "Contraseña cambiada exitosamente" };
}
