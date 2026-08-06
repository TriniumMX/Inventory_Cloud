import { apiFetch } from "./apiClient";
import type { InstitucionCreateDto, InstitucionUpdateDto } from "./schemasInstituciones";

export interface Institucion {
  id: number;
  nombre: string;
  estatus: 1 | 0;
}

export async function listInstituciones(
  params: { q?: string } = {}
): Promise<{ items: Institucion[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  const { data } = await apiFetch<{ data: { items: Institucion[]; total: number } }>(
    `/api/consignas?${qs.toString()}`
  );
  return data;
}

export async function createInstitucion(dto: InstitucionCreateDto): Promise<Institucion> {
  const { data } = await apiFetch<{ data: Institucion }>("/api/consignas", {
    method: "POST",
    body: JSON.stringify({ nombre: dto.nombre, estatus: dto.estatus }),
  });
  return data;
}

export async function updateInstitucion(id: number, dto: InstitucionUpdateDto): Promise<Institucion> {
  const { data } = await apiFetch<{ data: Institucion }>(`/api/consignas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
  return data;
}

export async function deleteInstitucion(id: number): Promise<void> {
  await apiFetch<{ data: null }>(`/api/consignas/${id}`, { method: "DELETE" });
}
