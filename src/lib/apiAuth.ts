import type { UsuarioAuth } from "./types";
import { API_URL, apiFetch } from "./apiClient";

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
}

export async function login(credentials: LoginCredentials): Promise<{ user: UsuarioAuth }> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Usuario o contraseña incorrectos");
  }

  const data: LoginResponse = await response.json();
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

    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });

    if (!response.ok) {
      localStorage.removeItem("auth:user");
      return null;
    }

    const data: LoginResponse = await response.json();
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
  return apiFetch<{ message: string }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ passwordActual, passwordNueva }),
  });
}
