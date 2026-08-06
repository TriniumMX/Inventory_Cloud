import { apiFetch } from "../apiClient";
import type { ApiResponse, PaginatedResponse } from "./types";
import type { ActivoReporte } from "../exportReportes";

// ============= REPORTES =============

interface ReporteFilters {
  tipo?: number;
  sinAsignar?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
}

async function fetchReporte(filters: ReporteFilters): Promise<ActivoReporte[]> {
  const qs = new URLSearchParams();
  if (filters.tipo !== undefined) qs.set("tipo", String(filters.tipo));
  if (filters.sinAsignar) qs.set("sinAsignar", "true");
  if (filters.fechaInicio) qs.set("fechaInicio", filters.fechaInicio);
  if (filters.fechaFin) qs.set("fechaFin", filters.fechaFin);

  const { data } = await apiFetch<{ data: ActivoReporte[] }>(`/api/activos/reporte?${qs.toString()}`);
  return data;
}

export async function getAllActivosSinAsignar(): Promise<ActivoReporte[]> {
  return fetchReporte({ sinAsignar: true });
}

export async function getActivosPorRangoAlta(fechaInicio: string, fechaFin: string): Promise<ActivoReporte[]> {
  return fetchReporte({ fechaInicio, fechaFin });
}

export async function getAllActivosForReport(tipo?: number): Promise<ActivoReporte[]> {
  return fetchReporte({ tipo });
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

function buildListQuery(params: ListActivosParams): URLSearchParams {
  const qs = new URLSearchParams();
  if (params.tipo !== undefined) qs.set("tipo", String(params.tipo));
  if (params.clasificacion !== undefined) qs.set("clasificacion", String(params.clasificacion));
  if (params.estatus !== undefined) qs.set("estatus", String(params.estatus));
  if (params.sinResguardante) qs.set("sinResguardante", "true");
  if (params.search) qs.set("search", params.search);
  return qs;
}

export async function listActivos(params: ListActivosParams = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;

  const qs = buildListQuery(params);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  return apiFetch<ApiResponse<PaginatedResponse<any>>>(`/api/activos?${qs.toString()}`);
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
  const qs = buildListQuery(params);
  const { data } = await apiFetch<{ data: number }>(`/api/activos/total-costo?${qs.toString()}`);
  return data;
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
  const qs = new URLSearchParams();
  if (tipo !== undefined) qs.set("tipo", String(tipo));
  return apiFetch<ApiResponse<{ items: any[] }>>(
    `/api/activos/por-nomina/${encodeURIComponent(ultimoNomina)}?${qs.toString()}`
  );
}

// ============= PRE-BAJA =============

export async function marcarPreBaja(ids: string[]): Promise<void> {
  await apiFetch<{ data: null }>("/api/activos/pre-baja", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function reactivarDesdePreBaja(ids: string[]): Promise<void> {
  await apiFetch<{ data: null }>("/api/activos/reactivar", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function confirmarBajaDefinitiva(ids: string[]): Promise<void> {
  await apiFetch<{ data: null }>("/api/activos/baja-definitiva", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
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
  return apiFetch<ApiResponse<{ items: AssetHistoryItem[] }>>(
    `/api/activos/historia?numero=${encodeURIComponent(numeroInventario)}`
  );
}

// ============= VALIDACIÓN =============

export async function checkNumeroInventarioExists(numeroInventario: string, excludeId?: string): Promise<boolean> {
  const qs = new URLSearchParams({ numero: numeroInventario });
  if (excludeId) qs.set("excludeId", excludeId);
  const { data } = await apiFetch<{ data: boolean }>(`/api/activos/check-inventario?${qs.toString()}`);
  return data;
}
