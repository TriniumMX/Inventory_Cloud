import bcrypt from "bcryptjs";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "./supabaseAudit";
import type { Usuario } from "./types";
import type { UsuarioCreateDto, UsuarioUpdateDto } from "./schemasUsuarios";
import type { ApiResponse } from "./api/types";

interface ListUsuariosParams {
  q?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listUsuarios(
  params: ListUsuariosParams = {}
): Promise<ApiResponse<{ items: Usuario[]; total: number }>> {
  const term = params.q || params.search || "";
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("usuarios").select("id_usuario, nombre, usuario, permisos", { count: "exact" });
  if (term) query = query.or(`nombre.ilike.%${term}%,usuario.ilike.%${term}%`);
  query = query.order("id_usuario").range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const items: Usuario[] = (data || []).map((r: any) => ({
    id: r.id_usuario,
    nombre: r.nombre || "",
    usuario: r.usuario || "",
    permisos: r.permisos || 1,
  }));

  return { data: { items, total: count ?? items.length } };
}

export async function createUsuario(dto: UsuarioCreateDto): Promise<ApiResponse<Usuario>> {
  const { data: existing } = await supabase.from("usuarios").select("id_usuario").ilike("usuario", dto.usuario).limit(1);
  if (existing && existing.length > 0) throw new Error("El nombre de usuario ya existe");

  const passwordHash = await bcrypt.hash(dto.password, 10);
  const { data, error } = await supabase
    .from("usuarios")
    .insert({ nombre: dto.nombre, usuario: dto.usuario, password_hash: passwordHash, permisos: dto.permisos })
    .select("id_usuario, nombre, usuario, permisos")
    .single();
  if (error) throw new Error(error.message);

  logAuditEvent("usuarios", String(data.id_usuario), "CREATE", null, null, dto.usuario);

  return { data: { id: data.id_usuario, nombre: data.nombre, usuario: data.usuario, permisos: data.permisos as 1 | 2 | 3 } };
}

export async function updateUsuario(id: number, dto: UsuarioUpdateDto): Promise<ApiResponse<Usuario>> {
  const { data: prev } = await supabase.from("usuarios").select("nombre, usuario, permisos").eq("id_usuario", id).maybeSingle();

  if (dto.usuario) {
    const { data: existing } = await supabase
      .from("usuarios")
      .select("id_usuario")
      .ilike("usuario", dto.usuario)
      .neq("id_usuario", id)
      .limit(1);
    if (existing && existing.length > 0) throw new Error("El nombre de usuario ya existe");
  }

  const update: Record<string, any> = {};
  if (dto.nombre !== undefined) update.nombre = dto.nombre;
  if (dto.usuario !== undefined) update.usuario = dto.usuario;
  if (dto.permisos !== undefined) update.permisos = dto.permisos;
  if (dto.password) {
    update.password_hash = await bcrypt.hash(dto.password, 10);
    update.password = null;
  }

  if (Object.keys(update).length === 0) throw new Error("Sin campos para actualizar");

  const { data, error } = await supabase
    .from("usuarios")
    .update(update as never)
    .eq("id_usuario", id)
    .select("id_usuario, nombre, usuario, permisos")
    .single();
  if (error) throw new Error(error.message);

  if (prev) {
    const fields: Array<[string, keyof UsuarioUpdateDto]> = [
      ["nombre", "nombre"],
      ["usuario", "usuario"],
      ["permisos", "permisos"],
    ];
    for (const [dbCol, dtoKey] of fields) {
      if (dto[dtoKey] === undefined) continue;
      const prevStr = (prev as any)[dbCol] != null ? String((prev as any)[dbCol]) : null;
      const newStr = dto[dtoKey] != null ? String(dto[dtoKey]) : null;
      if (prevStr !== newStr) logAuditEvent("usuarios", String(id), "UPDATE", dbCol, prevStr, newStr);
    }
    if (dto.password) logAuditEvent("usuarios", String(id), "UPDATE", "password", "***", "***");
  }

  return { data: { id: data.id_usuario, nombre: data.nombre, usuario: data.usuario, permisos: data.permisos as 1 | 2 | 3 } };
}

export async function deleteUsuario(id: number): Promise<ApiResponse<void>> {
  const { data: prev } = await supabase.from("usuarios").select("usuario").eq("id_usuario", id).maybeSingle();
  const { error } = await supabase.from("usuarios").delete().eq("id_usuario", id);
  if (error) throw new Error(error.message);

  logAuditEvent("usuarios", String(id), "DELETE", null, prev?.usuario || "", null);

  return { data: null };
}
