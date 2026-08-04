import { apiFetch } from "./apiClient";
import type { ModuloCatalog, UsuarioModuloAsignacion } from "./types";

export async function listModulos(): Promise<ModuloCatalog[]> {
  const res = await apiFetch<{ data: ModuloCatalog[] }>("/api/permisos/modulos");
  return res.data;
}

export async function getUsuarioModulos(userId: number): Promise<UsuarioModuloAsignacion[]> {
  const res = await apiFetch<{ data: UsuarioModuloAsignacion[] }>(
    `/api/permisos/usuario/${userId}`
  );
  return res.data;
}

export async function updateUsuarioModulos(
  userId: number,
  modulos: UsuarioModuloAsignacion[]
): Promise<void> {
  await apiFetch(`/api/permisos/usuario/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ modulos }),
  });
}
