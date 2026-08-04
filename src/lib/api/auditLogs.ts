import { apiFetch } from "../apiClient";

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
  const q = new URLSearchParams();
  if (params.tabla) q.set("tabla", params.tabla);
  if (params.registroId) q.set("registroId", params.registroId);
  if (params.accion) q.set("accion", params.accion);
  if (params.usuario) q.set("usuario", params.usuario);
  if (params.fechaDesde) q.set("fechaDesde", params.fechaDesde);
  if (params.fechaHasta) q.set("fechaHasta", params.fechaHasta);
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  if (params.offset !== undefined) q.set("offset", String(params.offset));

  const res = await apiFetch<{ data: { items: AuditLogEntry[]; total: number } }>(`/api/audit-logs?${q}`);
  return res.data;
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
  await apiFetch<{ ok: boolean }>("/api/audit-logs", {
    method: "POST",
    body: JSON.stringify({
      tabla: params.tabla,
      registroId: params.registroId,
      accion: params.accion,
      campo: params.campo,
      valorAnterior: params.valorAnterior,
      valorNuevo: params.valorNuevo,
    }),
  });
}
