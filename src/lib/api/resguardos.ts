import { apiFetch } from "../apiClient";
import type { ApiResponse } from "./types";

export async function listResguardos(folio?: string): Promise<ApiResponse<{ items: any[] }>> {
  const qs = new URLSearchParams();
  if (folio) qs.set("folio", folio);
  return apiFetch<ApiResponse<{ items: any[] }>>(`/api/resguardos?${qs.toString()}`);
}

export async function createResguardo(dto: {
  folio: string;
  nomina: string;
  numerosInventario: string[];
  idUsuario: number;
}): Promise<ApiResponse<any>> {
  return apiFetch<ApiResponse<any>>("/api/resguardos", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function reasignarBien(
  numeroInventario: string,
  nuevoDestinatario: string,
  idUsuario: number
): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>("/api/resguardos/reasignar", {
    method: "POST",
    body: JSON.stringify({ numeroInventario, nuevoDestinatario, idUsuario }),
  });
}

export async function traspasarInventarioCompleto(
  nominaOrigen: string,
  nominaDestino: string,
  idUsuario: number
): Promise<ApiResponse<{ transferidos: number }>> {
  return apiFetch<ApiResponse<{ transferidos: number }>>("/api/resguardos/traspasar", {
    method: "POST",
    body: JSON.stringify({ nominaOrigen, nominaDestino, idUsuario }),
  });
}
