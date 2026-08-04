import { supabase } from "@/integrations/supabase/client";
import type { ModuloCatalog, UsuarioModuloAsignacion } from "./types";

// modulos/usuario_modulos son opcionales en esta fase de reconexión a Supabase
// (ver plan §4) y no están en el esquema generado — se consultan sin tipado estricto.
const db = supabase as any;

export async function listModulos(): Promise<ModuloCatalog[]> {
  const { data, error } = await db
    .from("modulos")
    .select("clave, nombre, grupo, orden")
    .order("grupo")
    .order("orden");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getUsuarioModulos(userId: number): Promise<UsuarioModuloAsignacion[]> {
  const [{ data: modulos, error: modulosError }, { data: asignaciones, error: asigError }] = await Promise.all([
    db.from("modulos").select("id_modulo, clave").order("grupo").order("orden"),
    db.from("usuario_modulos").select("id_modulo, puede_ver, puede_editar").eq("id_usuario", userId),
  ]);
  if (modulosError) throw new Error(modulosError.message);
  if (asigError) throw new Error(asigError.message);

  const asigMap = new Map<number, { puede_ver: boolean; puede_editar: boolean }>();
  (asignaciones || []).forEach((a: any) => asigMap.set(a.id_modulo, a));

  return (modulos || []).map((m: any) => ({
    clave: m.clave,
    puedeVer: asigMap.get(m.id_modulo)?.puede_ver ?? false,
    puedeEditar: asigMap.get(m.id_modulo)?.puede_editar ?? false,
  }));
}

export async function updateUsuarioModulos(userId: number, modulos: UsuarioModuloAsignacion[]): Promise<void> {
  const { data: modulosCat, error: catError } = await db.from("modulos").select("id_modulo, clave");
  if (catError) throw new Error(catError.message);
  const claveMap = new Map<string, number>((modulosCat || []).map((m: any) => [m.clave, m.id_modulo]));

  const { error: deleteError } = await db.from("usuario_modulos").delete().eq("id_usuario", userId);
  if (deleteError) throw new Error(deleteError.message);

  const rows = modulos
    .filter((m) => m.puedeVer || m.puedeEditar)
    .map((m) => ({
      id_usuario: userId,
      id_modulo: claveMap.get(m.clave),
      puede_ver: m.puedeVer,
      puede_editar: m.puedeEditar ?? false,
    }))
    .filter((r) => r.id_modulo !== undefined);

  if (rows.length > 0) {
    const { error: insertError } = await db.from("usuario_modulos").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }
}
