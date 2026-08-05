import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "./supabaseAudit";
import type { Empleado } from "./types";
import type { EmpleadoCreateDto, EmpleadoUpdateDto } from "./schemasEmpleados";

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

export async function listEmpleados(
  params: { q?: string } = {}
): Promise<{ items: Empleado[]; total: number }> {
  const term = (params.q || "").trim();

  let query = db
    .from("empleados")
    .select("nomina, nombre, departamento, puesto, activo", { count: "exact" });

  if (term) {
    query = query.or(
      `nomina.ilike.%${term}%,nombre.ilike.%${term}%,departamento.ilike.%${term}%,puesto.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query.order("nombre").range(0, 9999);
  if (error) throw new Error(error.message);

  const items = (data || []) as Empleado[];
  return { items, total: count ?? items.length };
}

export async function createEmpleado(dto: EmpleadoCreateDto): Promise<Empleado> {
  const { data: existing } = await db
    .from("empleados")
    .select("nomina")
    .eq("nomina", dto.nomina)
    .maybeSingle();
  if (existing) throw new Error("Ya existe un empleado con esa nómina");

  const { data, error } = await db
    .from("empleados")
    .insert({
      nomina: dto.nomina,
      nombre: dto.nombre,
      departamento: dto.departamento || null,
      puesto: dto.puesto || null,
      activo: dto.activo,
    })
    .select("nomina, nombre, departamento, puesto, activo")
    .single();
  if (error) throw new Error(error.message);

  logAuditEvent("empleados", dto.nomina, "CREATE", null, null, dto.nombre);

  return data as Empleado;
}

export async function updateEmpleado(nomina: string, dto: EmpleadoUpdateDto): Promise<Empleado> {
  const { data: prev } = await db
    .from("empleados")
    .select("nombre, departamento, puesto, activo")
    .eq("nomina", nomina)
    .maybeSingle();

  const update: Record<string, unknown> = {};
  if (dto.nombre !== undefined) update.nombre = dto.nombre;
  if (dto.departamento !== undefined) update.departamento = dto.departamento || null;
  if (dto.puesto !== undefined) update.puesto = dto.puesto || null;
  if (dto.activo !== undefined) update.activo = dto.activo;
  if (Object.keys(update).length === 0) throw new Error("Sin campos para actualizar");

  const { data, error } = await db
    .from("empleados")
    .update(update)
    .eq("nomina", nomina)
    .select("nomina, nombre, departamento, puesto, activo")
    .single();
  if (error) throw new Error(error.message);

  if (prev) {
    const fields: Array<keyof typeof update & keyof typeof prev> = [
      "nombre",
      "departamento",
      "puesto",
      "activo",
    ];
    for (const field of fields) {
      if (update[field] === undefined) continue;
      const prevVal = prev[field] != null ? String(prev[field]) : null;
      const newVal = update[field] != null ? String(update[field]) : null;
      if (prevVal !== newVal) logAuditEvent("empleados", nomina, "UPDATE", field, prevVal, newVal);
    }
  }

  return data as Empleado;
}

export async function deleteEmpleado(nomina: string): Promise<void> {
  const { data: prev } = await db.from("empleados").select("nombre").eq("nomina", nomina).maybeSingle();
  const { error } = await db.from("empleados").delete().eq("nomina", nomina);
  if (error) throw new Error(error.message);

  logAuditEvent("empleados", nomina, "DELETE", null, prev?.nombre || "", null);
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
