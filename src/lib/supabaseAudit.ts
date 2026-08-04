import { supabase } from "@/integrations/supabase/client";
import type { UsuarioAuth } from "./types";

// audit_logs es opcional en esta fase de reconexión a Supabase (ver plan §4)
// y no está en el esquema generado — se consulta sin tipado estricto.
const db = supabase as any;

function getCurrentUser(): UsuarioAuth | null {
  try {
    const stored = localStorage.getItem("auth:user");
    return stored ? (JSON.parse(stored) as UsuarioAuth) : null;
  } catch {
    return null;
  }
}

// Best-effort: audit_logs es una tabla opcional en esta fase de reconexión a Supabase.
// Si no existe todavía, esto falla en silencio en vez de romper la operación principal.
export async function logAuditEvent(
  tabla: string,
  registroId: string,
  accion: string,
  campo: string | null = null,
  valorAnterior: string | null = null,
  valorNuevo: string | null = null
): Promise<void> {
  const user = getCurrentUser();
  try {
    await db.from("audit_logs").insert({
      tabla,
      registro_id: registroId,
      accion,
      campo,
      valor_anterior: valorAnterior,
      valor_nuevo: valorNuevo,
      id_usuario: user?.id ?? null,
      usuario: user?.usuario ?? null,
      nombre_usuario: user?.nombre ?? null,
    });
  } catch {
    // silencioso a propósito
  }
}
