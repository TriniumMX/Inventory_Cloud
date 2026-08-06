import { apiFetch } from "./apiClient";
import type { ModuloCatalog, UsuarioModuloAsignacion } from "./types";

export async function listModulos(): Promise<ModuloCatalog[]> {
  const { data } = await apiFetch<{ data: ModuloCatalog[] }>("/api/permisos/modulos");
  return data;
}

export async function getUsuarioModulos(userId: number): Promise<UsuarioModuloAsignacion[]> {
  const { data } = await apiFetch<{ data: UsuarioModuloAsignacion[] }>(`/api/permisos/usuario/${userId}`);
  return data;
}

export async function updateUsuarioModulos(userId: number, modulos: UsuarioModuloAsignacion[]): Promise<void> {
  await apiFetch<{ data: null }>(`/api/permisos/usuario/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ modulos }),
  });
}
