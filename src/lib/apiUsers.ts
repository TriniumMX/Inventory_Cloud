import { apiFetch } from "./apiClient";
import type { Usuario } from "./types";
import type { UsuarioCreateDto, UsuarioUpdateDto } from "./schemasUsuarios";
import type { ApiResponse } from "./api/types";

interface ListUsuariosParams {
  q?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listUsuarios(
  params: ListUsuariosParams = {}
): Promise<ApiResponse<{ items: Usuario[]; total: number }>> {
  const term = params.q || params.search || "";
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;

  const qs = new URLSearchParams();
  if (term) qs.set("q", term);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  return apiFetch<ApiResponse<{ items: Usuario[]; total: number }>>(`/api/usuarios?${qs.toString()}`);
}

export async function createUsuario(dto: UsuarioCreateDto): Promise<ApiResponse<Usuario>> {
  return apiFetch<ApiResponse<Usuario>>("/api/usuarios", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateUsuario(id: number, dto: UsuarioUpdateDto): Promise<ApiResponse<Usuario>> {
  return apiFetch<ApiResponse<Usuario>>(`/api/usuarios/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export async function deleteUsuario(id: number): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(`/api/usuarios/${id}`, { method: "DELETE" });
}
