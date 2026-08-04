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

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await apiFetch<{ data: DashboardStats }>("/api/dashboard/stats");
  return res.data;
}

export async function getActividadReciente(): Promise<ActividadReciente[]> {
  const res = await apiFetch<{ data: ActividadReciente[] }>("/api/dashboard/actividad");
  return res.data;
}
