import { apiFetch } from "./apiClient";
import type { Empleado } from "./types";

export type { Empleado };

export interface EmpleadoBajaItem extends Empleado {
  totalBienes: number;
}

export async function getEmployeeByNomina(nomina: string): Promise<Empleado | null> {
  const res = await apiFetch<Empleado>(`/api/empleados/${encodeURIComponent(nomina)}`);
  return res;
}

export async function searchEmployees(term: string): Promise<Empleado[]> {
  const empleado = await getEmployeeByNomina(term);
  return empleado ? [empleado] : [];
}

export async function getAllEmployees(): Promise<Empleado[]> {
  console.warn("getAllEmployees no está soportado con el web service externo");
  return [];
}

export async function getEmpleadosBaja(): Promise<EmpleadoBajaItem[]> {
  const res = await apiFetch<{ data: { items: EmpleadoBajaItem[] } }>("/api/empleados/bajas");
  return res.data.items;
}
