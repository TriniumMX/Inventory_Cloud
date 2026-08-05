import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "./supabaseAudit";
import type { InstitucionCreateDto, InstitucionUpdateDto } from "./schemasInstituciones";

// `consignas` no está en el esquema generado de Supabase (mismo caso que
// empleados/modulos) — se consulta sin tipado estricto.
const db = supabase as any;

export interface Institucion {
  id: number;
  nombre: string;
  estatus: 1 | 0;
}

export async function listInstituciones(
  params: { q?: string } = {}
): Promise<{ items: Institucion[]; total: number }> {
  const term = (params.q || "").trim();

  let query = db.from("consignas").select("id_consigna, consigna, estatus", { count: "exact" });
  if (term) query = query.ilike("consigna", `%${term}%`);

  const { data, error, count } = await query.order("consigna").range(0, 9999);
  if (error) throw new Error(error.message);

  const items: Institucion[] = (data || []).map((r: any) => ({
    id: r.id_consigna,
    nombre: r.consigna || "",
    estatus: r.estatus === 1 ? 1 : 0,
  }));

  return { items, total: count ?? items.length };
}

export async function createInstitucion(dto: InstitucionCreateDto): Promise<Institucion> {
  const { data: existing } = await db
    .from("consignas")
    .select("id_consigna")
    .ilike("consigna", dto.nombre)
    .limit(1);
  if (existing && existing.length > 0) throw new Error("Ya existe una institución con ese nombre");

  const { data, error } = await db
    .from("consignas")
    .insert({ consigna: dto.nombre, estatus: dto.estatus })
    .select("id_consigna, consigna, estatus")
    .single();
  if (error) throw new Error(error.message);

  logAuditEvent("consignas", String(data.id_consigna), "CREATE", null, null, dto.nombre);

  return { id: data.id_consigna, nombre: data.consigna, estatus: data.estatus === 1 ? 1 : 0 };
}

export async function updateInstitucion(id: number, dto: InstitucionUpdateDto): Promise<Institucion> {
  const { data: prev } = await db
    .from("consignas")
    .select("consigna, estatus")
    .eq("id_consigna", id)
    .maybeSingle();

  if (dto.nombre) {
    const { data: existing } = await db
      .from("consignas")
      .select("id_consigna")
      .ilike("consigna", dto.nombre)
      .neq("id_consigna", id)
      .limit(1);
    if (existing && existing.length > 0) throw new Error("Ya existe una institución con ese nombre");
  }

  const update: Record<string, unknown> = {};
  if (dto.nombre !== undefined) update.consigna = dto.nombre;
  if (dto.estatus !== undefined) update.estatus = dto.estatus;
  if (Object.keys(update).length === 0) throw new Error("Sin campos para actualizar");

  const { data, error } = await db
    .from("consignas")
    .update(update)
    .eq("id_consigna", id)
    .select("id_consigna, consigna, estatus")
    .single();
  if (error) throw new Error(error.message);

  if (prev) {
    if (dto.nombre !== undefined && prev.consigna !== dto.nombre) {
      logAuditEvent("consignas", String(id), "UPDATE", "consigna", prev.consigna, dto.nombre);
    }
    if (dto.estatus !== undefined && prev.estatus !== dto.estatus) {
      logAuditEvent("consignas", String(id), "UPDATE", "estatus", String(prev.estatus), String(dto.estatus));
    }
  }

  return { id: data.id_consigna, nombre: data.consigna, estatus: data.estatus === 1 ? 1 : 0 };
}

export async function deleteInstitucion(id: number): Promise<void> {
  const { data: prev } = await db.from("consignas").select("consigna").eq("id_consigna", id).maybeSingle();
  const { error } = await db.from("consignas").delete().eq("id_consigna", id);
  if (error) throw new Error(error.message);

  logAuditEvent("consignas", String(id), "DELETE", null, prev?.consigna || "", null);
}
