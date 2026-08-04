import { supabase } from "@/integrations/supabase/client";
import type { Empleado } from "./types";

export type { Empleado };

export interface EmpleadoBajaItem extends Empleado {
  totalBienes: number;
}

// La tabla `empleados` es local a Supabase (ver supabase/migrations/20260804120000_empleados.sql)
// y reemplaza temporalmente al web service SOAP externo (sistema de producción) por
// privacidad de datos durante pruebas/demo. No está en el esquema generado — sin tipado estricto.
const db = supabase as any;

export async function getEmployeeByNomina(nomina: string): Promise<Empleado | null> {
  const { data, error } = await db
    .from("empleados")
    .select("nomina, nombre, departamento, puesto, activo")
    .eq("nomina", nomina)
    .maybeSingle();

  if (error || !data) return null;
  return data as Empleado;
}

export async function searchEmployees(term: string): Promise<Empleado[]> {
  const { data, error } = await db
    .from("empleados")
    .select("nomina, nombre, departamento, puesto, activo")
    .or(`nomina.ilike.%${term}%,nombre.ilike.%${term}%`)
    .limit(20);

  if (error) return [];
  return (data || []) as Empleado[];
}

export async function getAllEmployees(): Promise<Empleado[]> {
  const { data, error } = await db
    .from("empleados")
    .select("nomina, nombre, departamento, puesto, activo")
    .order("nombre")
    .range(0, 9999);

  if (error) return [];
  return (data || []) as Empleado[];
}

export async function getEmpleadosBaja(): Promise<EmpleadoBajaItem[]> {
  const { data: activosRows, error: activosError } = await supabase
    .from("activos")
    .select("ultimo_nomina")
    .neq("estatus", 0)
    .not("ultimo_nomina", "is", null)
    .neq("ultimo_nomina", "")
    .range(0, 49999);

  if (activosError || !activosRows) return [];

  const countMap = new Map<string, number>();
  for (const row of activosRows as any[]) {
    const n = row.ultimo_nomina as string;
    countMap.set(n, (countMap.get(n) || 0) + 1);
  }

  const nominas = [...countMap.keys()];
  if (nominas.length === 0) return [];

  const { data: empleadosRows, error: empError } = await db
    .from("empleados")
    .select("nomina, nombre, departamento, puesto, activo")
    .in("nomina", nominas);

  if (empError || !empleadosRows) return [];

  return (empleadosRows as any[])
    .filter((e) => e.activo !== "A")
    .map((e) => ({ ...e, totalBienes: countMap.get(e.nomina) || 0 }))
    .sort((a, b) => b.totalBienes - a.totalBienes);
}
