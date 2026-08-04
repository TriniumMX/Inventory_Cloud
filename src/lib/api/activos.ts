import { apiFetch } from "../apiClient";
import type { ApiResponse, PaginatedResponse } from "./types";
import type { ActivoReporte } from "../exportReportes";

// ============= REPORTES =============

export async function getAllActivosSinAsignar(): Promise<ActivoReporte[]> {
  const res = await apiFetch<{ data: ActivoReporte[] }>("/api/activos/reporte?sinAsignar=true");
  return res.data;
}

export async function getActivosPorRangoAlta(fechaInicio: string, fechaFin: string): Promise<ActivoReporte[]> {
  const res = await apiFetch<{ data: ActivoReporte[] }>(
    `/api/activos/reporte?fechaInicio=${encodeURIComponent(fechaInicio)}&fechaFin=${encodeURIComponent(fechaFin)}`
  );
  return res.data;
}

export async function getAllActivosForReport(tipo?: number): Promise<ActivoReporte[]> {
  const q = tipo !== undefined ? `?tipo=${tipo}` : "";
  const res = await apiFetch<{ data: ActivoReporte[] }>(`/api/activos/reporte${q}`);
  return res.data;
}

// ============= LISTADO PAGINADO =============

interface ListActivosParams {
  tipo?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  clasificacion?: number;
  estatus?: number;
  sinResguardante?: boolean;
}

export async function listActivos(params: ListActivosParams = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
  const q = new URLSearchParams();
  if (params.tipo !== undefined) q.set("tipo", String(params.tipo));
  if (params.clasificacion !== undefined) q.set("clasificacion", String(params.clasificacion));
  if (params.estatus !== undefined) q.set("estatus", String(params.estatus));
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.sinResguardante) q.set("sinResguardante", "true");

  return apiFetch<ApiResponse<PaginatedResponse<any>>>(`/api/activos?${q}`);
}

// ============= TOTAL COSTO =============

interface TotalCostoParams {
  tipo?: number;
  search?: string;
  clasificacion?: number;
  estatus?: number;
  sinResguardante?: boolean;
}

export async function getTotalCostoActivos(params: TotalCostoParams = {}): Promise<number> {
  const q = new URLSearchParams();
  if (params.tipo !== undefined) q.set("tipo", String(params.tipo));
  if (params.clasificacion !== undefined) q.set("clasificacion", String(params.clasificacion));
  if (params.estatus !== undefined) q.set("estatus", String(params.estatus));
  if (params.search) q.set("search", params.search);
  if (params.sinResguardante) q.set("sinResguardante", "true");

  const res = await apiFetch<{ data: number }>(`/api/activos/total-costo?${q}`);
  return res.data;
}

// ============= CRUD =============

export async function createActivo(dto: any): Promise<ApiResponse<any>> {
  return apiFetch<ApiResponse<any>>("/api/activos", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateActivo(id: string, dto: any): Promise<ApiResponse<any>> {
  return apiFetch<ApiResponse<any>>(`/api/activos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export async function deleteActivo(id: string): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(`/api/activos/${id}`, { method: "DELETE" });
}

export async function listActivosByUltimoNomina(
  ultimoNomina: string,
  tipo?: number
): Promise<ApiResponse<{ items: any[] }>> {
  const q = tipo !== undefined ? `?tipo=${tipo}` : "";
  return apiFetch<ApiResponse<{ items: any[] }>>(`/api/activos/por-nomina/${encodeURIComponent(ultimoNomina)}${q}`);
}

// ============= PRE-BAJA =============

export async function marcarPreBaja(ids: string[]): Promise<void> {
  await apiFetch("/api/activos/pre-baja", { method: "POST", body: JSON.stringify({ ids }) });
}

export async function reactivarDesdePreBaja(ids: string[]): Promise<void> {
  await apiFetch("/api/activos/reactivar", { method: "POST", body: JSON.stringify({ ids }) });
}

export async function confirmarBajaDefinitiva(ids: string[]): Promise<void> {
  await apiFetch("/api/activos/baja-definitiva", { method: "POST", body: JSON.stringify({ ids }) });
}

// ============= HISTORIAL =============

export interface AssetHistoryItem {
  fecha: string;
  tipo: string;
  usuario: string;
  detalle: string;
  realizadoPor: string;
}

export async function getAssetHistory(numeroInventario: string): Promise<ApiResponse<{ items: AssetHistoryItem[] }>> {
  const res = await apiFetch<{ data: { items: AssetHistoryItem[] } }>(
    `/api/activos/historia?numero=${encodeURIComponent(numeroInventario)}`
  );
  return { data: res.data };
}

// ============= VALIDACIÓN =============

export async function checkNumeroInventarioExists(
  numeroInventario: string,
  excludeId?: string
): Promise<boolean> {
  const q = new URLSearchParams({ numero: numeroInventario });
  if (excludeId) q.set("excludeId", excludeId);
  const res = await apiFetch<{ data: boolean }>(`/api/activos/check-inventario?${q}`);
  return res.data;
}
