import { apiFetch } from "../apiClient";

export interface DashboardStats {
  bienesMuebles: number;
  enseres: number;
  bienesInmuebles: number;
  resguardosActivos: number;
  resguardosMuebles: number;
  resguardosEnseres: number;
  valorMuebles: number;
  valorEnseres: number;
}

export interface ActividadReciente {
  tipo: "resguardo" | "activo";
  descripcion: string;
  fecha: string;
  detalle?: string;
}

export interface PatrimonioMensual {
  mes: string; // "ene 2026"
  open: number;
  high: number;
  low: number;
  close: number;
  altas: number;
}

export interface EstatusDistribucionItem {
  estatus: "Activo" | "Almacén" | "Pre-Baja";
  cantidad: number;
}

export interface ClasificacionTopItem {
  nombre: string;
  cantidad: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiFetch<{ data: DashboardStats }>("/api/dashboard/stats");
  return data;
}

export async function getActividadReciente(): Promise<ActividadReciente[]> {
  const { data } = await apiFetch<{ data: ActividadReciente[] }>("/api/dashboard/actividad");
  return data;
}

/**
 * Altas de bienes por mes (últimos N meses), agregadas en formato OHLC
 * (apertura/máximo/mínimo/cierre del costo de los bienes dados de alta ese
 * mes) para una gráfica estilo velas del valor patrimonial incorporado.
 */
export async function getPatrimonioMensual(months = 6): Promise<PatrimonioMensual[]> {
  const { data } = await apiFetch<{ data: PatrimonioMensual[] }>(`/api/dashboard/patrimonio-mensual?months=${months}`);
  return data;
}

/** Distribución de bienes muebles y enseres por estatus operativo (excluye baja). */
export async function getEstatusDistribucion(): Promise<EstatusDistribucionItem[]> {
  const { data } = await apiFetch<{ data: EstatusDistribucionItem[] }>("/api/dashboard/estatus-distribucion");
  return data;
}

/** Top N clasificaciones con más bienes registrados. */
export async function getTopClasificaciones(limit = 6): Promise<ClasificacionTopItem[]> {
  const { data } = await apiFetch<{ data: ClasificacionTopItem[] }>(`/api/dashboard/top-clasificaciones?limit=${limit}`);
  return data;
}
