import { supabase } from "@/integrations/supabase/client";
import { getEmployeeByNomina } from "../employees";
import type { ApiResponse } from "./types";

export async function buscarEmpleado(nomina: string): Promise<ApiResponse<any>> {
  const empleado = await getEmployeeByNomina(nomina);
  return { data: empleado };
}

export async function listConsignas(): Promise<ApiResponse<{ items: any[] }>> {
  const { data, error } = await supabase
    .from("consignas")
    .select("*")
    .eq("estatus", 1)
    .order("id_consigna");
  if (error) throw new Error(error.message);
  return { data: { items: (data || []).map((r: any) => ({ id: r.id_consigna, nombre: r.consigna })) } };
}

export async function listClasificaciones(): Promise<ApiResponse<{ items: any[] }>> {
  const { data, error } = await supabase
    .from("clasificacion")
    .select("*")
    .eq("estatus", 1)
    .order("id_clasificacion")
    .range(0, 9999);
  if (error) throw new Error(error.message);
  return {
    data: {
      items: (data || []).map((r: any) => ({
        id: String(r.id_clasificacion),
        codigo: String(r.id_clasificacion),
        nombre: r.clasificacion || "",
      })),
    },
  };
}

export async function listCuentasContables(): Promise<ApiResponse<{ items: any[] }>> {
  const { data, error } = await supabase
    .from("ctas_contables")
    .select("*")
    .eq("estatus", 1)
    .order("id_ctacontable")
    .range(0, 9999);
  if (error) throw new Error(error.message);
  return {
    data: {
      items: (data || []).map((r: any) => ({
        id: String(r.id_ctacontable),
        cta_contable: r.cta_contable || "",
        ctaContable: r.cta_contable || "",
        descripcion: r.descripcion || "",
        clasificacion: r.id_clasificacion_cta,
      })),
    },
  };
}
