import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "../supabaseAudit";

// audit_logs es opcional en esta fase de reconexión a Supabase (ver plan §4)
// y no está en el esquema generado — se consulta sin tipado estricto.
const db = supabase as any;

export interface AuditLogEntry {
  id: number;
  tabla: string;
  registro_id: string;
  accion: string;
  campo: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  id_usuario: number;
  usuario: string;
  nombre_usuario: string | null;
  ip_address: string | null;
  created_at: string;
  descripcion_registro: string | null;
}

export interface GetAuditLogsParams {
  tabla?: string;
  registroId?: string;
  accion?: string;
  usuario?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
  offset?: number;
}

export async function getAuditLogs(params: GetAuditLogsParams = {}): Promise<{ items: AuditLogEntry[]; total: number }> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = db.from("audit_logs").select("*", { count: "exact" });
  if (params.tabla && params.tabla !== "todos") query = query.eq("tabla", params.tabla);
  if (params.registroId) query = query.eq("registro_id", params.registroId);
  if (params.accion && params.accion !== "TODOS") query = query.eq("accion", params.accion);
  if (params.usuario) query = query.or(`usuario.ilike.%${params.usuario}%,nombre_usuario.ilike.%${params.usuario}%`);
  if (params.fechaDesde) query = query.gte("created_at", params.fechaDesde);
  if (params.fechaHasta) query = query.lte("created_at", `${params.fechaHasta}T23:59:59Z`);

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = data || [];

  const activosIds = rows.filter((r: any) => r.tabla === "activos").map((r: any) => r.registro_id);
  const inmueblesIds = rows.filter((r: any) => r.tabla === "bienes_inmuebles").map((r: any) => r.registro_id);
  const usuariosIds = rows.filter((r: any) => r.tabla === "usuarios").map((r: any) => r.registro_id);

  const [activosDesc, inmueblesDesc, usuariosDesc] = await Promise.all([
    activosIds.length
      ? supabase.from("activos").select("id_consecutivo, numero_inventario, descripcion").in("id_consecutivo", activosIds.map(Number))
      : Promise.resolve({ data: [] as any[] }),
    inmueblesIds.length
      ? supabase.from("bienes_inmuebles").select("id, numero_inventario, descripcion").in("id", inmueblesIds.map(Number))
      : Promise.resolve({ data: [] as any[] }),
    usuariosIds.length
      ? supabase.from("usuarios").select("id_usuario, nombre").in("id_usuario", usuariosIds.map(Number))
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const activosMap = new Map(
    (activosDesc.data || []).map((a: any) => [String(a.id_consecutivo), `${a.numero_inventario} – ${a.descripcion}`])
  );
  const inmueblesMap = new Map(
    (inmueblesDesc.data || []).map((b: any) => [String(b.id), `${b.numero_inventario} – ${b.descripcion}`])
  );
  const usuariosMap = new Map((usuariosDesc.data || []).map((u: any) => [String(u.id_usuario), u.nombre]));

  const items: AuditLogEntry[] = rows.map((r: any) => {
    let descripcion_registro: string | null = null;
    if (r.tabla === "activos") descripcion_registro = activosMap.get(r.registro_id) ?? null;
    else if (r.tabla === "bienes_inmuebles") descripcion_registro = inmueblesMap.get(r.registro_id) ?? null;
    else if (r.tabla === "usuarios") descripcion_registro = usuariosMap.get(r.registro_id) ?? null;

    return { ...r, descripcion_registro };
  });

  return { items, total: count ?? items.length };
}

export interface LogClientEventParams {
  tabla: string;
  registroId?: string;
  accion: string;
  campo?: string;
  valorAnterior?: string;
  valorNuevo?: string;
}

export async function logClientEvent(params: LogClientEventParams): Promise<void> {
  await logAuditEvent(
    params.tabla,
    params.registroId || "-",
    params.accion,
    params.campo || null,
    params.valorAnterior || null,
    params.valorNuevo || null
  );
}
