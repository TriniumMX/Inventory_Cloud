import { apiFetch } from "../apiClient";
import { getEmployeeByNomina } from "../employees";
import type { ApiResponse } from "./types";

export async function buscarEmpleado(nomina: string): Promise<ApiResponse<any>> {
  const empleado = await getEmployeeByNomina(nomina);
  return { data: empleado };
}

export async function listConsignas(): Promise<ApiResponse<{ items: any[] }>> {
  return apiFetch<ApiResponse<{ items: any[] }>>("/api/catalogos/consignas");
}

export async function listClasificaciones(): Promise<ApiResponse<{ items: any[] }>> {
  return apiFetch<ApiResponse<{ items: any[] }>>("/api/catalogos/clasificaciones");
}

export async function listCuentasContables(): Promise<ApiResponse<{ items: any[] }>> {
  return apiFetch<ApiResponse<{ items: any[] }>>("/api/catalogos/cuentas-contables");
}
