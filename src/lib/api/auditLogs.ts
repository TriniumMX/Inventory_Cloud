import { apiFetch } from "../apiClient";
import { logAuditEvent } from "../supabaseAudit";

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
  const qs = new URLSearchParams();
  if (params.tabla) qs.set("tabla", params.tabla);
  if (params.registroId) qs.set("registroId", params.registroId);
  if (params.accion) qs.set("accion", params.accion);
  if (params.usuario) qs.set("usuario", params.usuario);
  if (params.fechaDesde) qs.set("fechaDesde", params.fechaDesde);
  if (params.fechaHasta) qs.set("fechaHasta", params.fechaHasta);
  qs.set("limit", String(params.limit ?? 50));
  qs.set("offset", String(params.offset ?? 0));

  const { data } = await apiFetch<{ data: { items: AuditLogEntry[]; total: number } }>(
    `/api/audit-logs?${qs.toString()}`
  );
  return data;
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
