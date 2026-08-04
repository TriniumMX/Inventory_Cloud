import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "../supabaseAudit";
import type { ApiResponse } from "./types";

export async function listResguardos(folio?: string): Promise<ApiResponse<{ items: any[] }>> {
  let query = supabase.from("resguardos").select("*").eq("estatus", true).order("fecha", { ascending: false });
  if (folio) query = query.ilike("folio", `%${folio}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const groupedMap = new Map<
    string,
    { folio: string; nomina: string; fecha: string; estatus: boolean; idUsuario: number; activos: string[] }
  >();
  for (const row of data || []) {
    if (!groupedMap.has(row.folio)) {
      groupedMap.set(row.folio, {
        folio: row.folio,
        nomina: row.nomina,
        fecha: row.fecha,
        estatus: row.estatus,
        idUsuario: row.id_usuario,
        activos: [],
      });
    }
    groupedMap.get(row.folio)!.activos.push(row.numero_inventario);
  }

  return { data: { items: Array.from(groupedMap.values()) } };
}

async function nextFolioClientSide(prefix: "RS" | "TM"): Promise<string> {
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from("resguardos")
    .select("folio")
    .ilike("folio", `${prefix}-${year}-%`)
    .order("folio", { ascending: false })
    .limit(1);

  let nextNumber = 1;
  const last = data?.[0]?.folio;
  if (last) {
    const match = last.match(new RegExp(`${prefix}-\\d{4}-(\\d+)`));
    if (match) nextNumber = parseInt(match[1]) + 1;
  }
  return `${prefix}-${year}-${String(nextNumber).padStart(5, "0")}`;
}

export async function createResguardo(dto: {
  folio: string;
  nomina: string;
  numerosInventario: string[];
  idUsuario: number;
}): Promise<ApiResponse<any>> {
  const fecha = new Date().toISOString();
  const rows = dto.numerosInventario.map((numInv) => ({
    folio: dto.folio,
    nomina: dto.nomina,
    numero_inventario: numInv,
    fecha,
    estatus: true,
    id_usuario: dto.idUsuario,
  }));

  const { error: insertError } = await supabase.from("resguardos").insert(rows);
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("activos")
    .update({ ultimo_nomina: dto.nomina })
    .in("numero_inventario", dto.numerosInventario);
  if (updateError) throw new Error(updateError.message);

  dto.numerosInventario.forEach((numInv) =>
    logAuditEvent("resguardos", dto.folio, "CREATE", "asignacion", null, `${numInv} → ${dto.nomina}`)
  );

  return { data: null };
}

export async function reasignarBien(
  numeroInventario: string,
  nuevoDestinatario: string,
  idUsuario: number
): Promise<ApiResponse<void>> {
  const { data: prevRows } = await supabase
    .from("resguardos")
    .select("nomina")
    .eq("numero_inventario", numeroInventario)
    .eq("estatus", true)
    .limit(1);
  const nominaAnterior = prevRows?.[0]?.nomina || null;

  const { error: deactivateError } = await supabase
    .from("resguardos")
    .update({ estatus: false })
    .eq("numero_inventario", numeroInventario)
    .eq("estatus", true);
  if (deactivateError) throw new Error(deactivateError.message);

  const folio = await nextFolioClientSide("RS");

  const { error: insertError } = await supabase.from("resguardos").insert({
    folio,
    numero_inventario: numeroInventario,
    nomina: nuevoDestinatario,
    fecha: new Date().toISOString(),
    estatus: true,
    id_usuario: idUsuario,
  });
  if (insertError) throw new Error(insertError.message);

  const { error: updateActivoError } = await supabase
    .from("activos")
    .update({ ultimo_nomina: nuevoDestinatario })
    .eq("numero_inventario", numeroInventario);
  if (updateActivoError) throw new Error(updateActivoError.message);

  logAuditEvent("resguardos", numeroInventario, "UPDATE", "nomina", nominaAnterior, nuevoDestinatario);

  return { data: null };
}

export async function traspasarInventarioCompleto(
  nominaOrigen: string,
  nominaDestino: string,
  idUsuario: number
): Promise<ApiResponse<{ transferidos: number }>> {
  const { data: activosRows, error: fetchError } = await supabase
    .from("activos")
    .select("numero_inventario")
    .eq("ultimo_nomina", nominaOrigen)
    .neq("estatus", 0);
  if (fetchError) throw new Error(fetchError.message);

  const numerosInventario = (activosRows || []).map((r: any) => r.numero_inventario).filter(Boolean);
  if (numerosInventario.length === 0) {
    return { data: { transferidos: 0 } };
  }

  const { error: deactivateError } = await supabase
    .from("resguardos")
    .update({ estatus: false })
    .in("numero_inventario", numerosInventario)
    .eq("estatus", true);
  if (deactivateError) throw new Error(deactivateError.message);

  const folioTraspaso = await nextFolioClientSide("TM");
  const fecha = new Date().toISOString();

  const rows = numerosInventario.map((numInv: string) => ({
    folio: folioTraspaso,
    numero_inventario: numInv,
    nomina: nominaDestino,
    fecha,
    estatus: true,
    id_usuario: idUsuario,
  }));

  const { error: insertError } = await supabase.from("resguardos").insert(rows);
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("activos")
    .update({ ultimo_nomina: nominaDestino })
    .in("numero_inventario", numerosInventario);
  if (updateError) throw new Error(updateError.message);

  logAuditEvent("resguardos", folioTraspaso, "TRASPASAR", "nomina", nominaOrigen, nominaDestino);

  return { data: { transferidos: numerosInventario.length } };
}
