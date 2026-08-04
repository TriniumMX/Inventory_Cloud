import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "../supabaseAudit";
import type { ApiResponse, PaginatedResponse } from "./types";
import type { ActivoReporte } from "../exportReportes";

const ESTATUS_MAP: Record<number, string> = { 1: "ACTIVO", 0: "BAJA", 2: "ALMACEN", 3: "PRE-BAJA" };
const ESTATUS_REVERSE_MAP: Record<string, number> = { ACTIVO: 1, BAJA: 0, ALMACEN: 2, "PRE-BAJA": 3 };

// Rango amplio para evitar el límite por defecto de PostgREST en consultas "sin paginar"
const UNBOUNDED_RANGE: [number, number] = [0, 49999];

async function getClasificacionMap(): Promise<Map<number, string>> {
  const { data } = await supabase.from("clasificacion").select("id_clasificacion, clasificacion").range(...UNBOUNDED_RANGE);
  const map = new Map<number, string>();
  (data || []).forEach((r: any) => map.set(r.id_clasificacion, r.clasificacion));
  return map;
}

async function getCtaContableMap(): Promise<Map<number, { cta_contable: string; descripcion: string }>> {
  const { data } = await supabase.from("ctas_contables").select("id_ctacontable, cta_contable, descripcion").range(...UNBOUNDED_RANGE);
  const map = new Map<number, { cta_contable: string; descripcion: string }>();
  (data || []).forEach((r: any) => map.set(r.id_ctacontable, { cta_contable: r.cta_contable, descripcion: r.descripcion }));
  return map;
}

// ============= REPORTES =============

interface ReporteFilters {
  tipo?: number;
  sinAsignar?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
}

async function fetchReporte(filters: ReporteFilters): Promise<ActivoReporte[]> {
  let query = supabase
    .from("activos")
    .select(
      "numero_inventario, descripcion, marca, modelo, numero_serie, f_alta, f_factura, costo, folio_factura, observaciones, ultimo_nomina, clasificacion"
    )
    .neq("estatus", 0)
    .order("numero_inventario")
    .range(...UNBOUNDED_RANGE);

  if (filters.tipo !== undefined) query = query.eq("tipo", filters.tipo);
  if (filters.sinAsignar) query = query.is("ultimo_nomina", null).eq("estatus", 1);
  if (filters.fechaInicio) query = query.gte("f_alta", filters.fechaInicio);
  if (filters.fechaFin) query = query.lte("f_alta", filters.fechaFin);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    numeroInventario: row.numero_inventario || "",
    descripcion: row.descripcion || "",
    marca: row.marca,
    modelo: row.modelo,
    serie: row.numero_serie,
    fechaAlta: row.f_alta,
    fechaFactura: row.f_factura,
    costo: row.costo || 0,
    folioFactura: row.folio_factura,
    observaciones: row.observaciones,
    resguardatario: row.ultimo_nomina,
    clasificacion: row.clasificacion != null ? String(row.clasificacion) : undefined,
  }));
}

export async function getAllActivosSinAsignar(): Promise<ActivoReporte[]> {
  return fetchReporte({ sinAsignar: true });
}

export async function getActivosPorRangoAlta(fechaInicio: string, fechaFin: string): Promise<ActivoReporte[]> {
  return fetchReporte({ fechaInicio, fechaFin });
}

export async function getAllActivosForReport(tipo?: number): Promise<ActivoReporte[]> {
  return fetchReporte({ tipo });
}

// ============= LISTADO PAGINADO =============

interface ListActivosParams {
  tipo?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  clasificacion?: number;
  estatus?: number;
  sinResguardante?: boolean;
}

function applyListFilters(query: any, params: ListActivosParams) {
  if (params.tipo !== undefined) query = query.eq("tipo", params.tipo);
  if (params.clasificacion !== undefined) query = query.eq("clasificacion", params.clasificacion);
  if (params.estatus !== undefined) query = query.eq("estatus", params.estatus);
  else query = query.neq("estatus", 0);
  if (params.sinResguardante) query = query.is("ultimo_nomina", null);
  if (params.search) {
    const s = params.search.replace(/[,()]/g, " ").trim();
    if (s) {
      query = query.or(
        `numero_inventario.ilike.%${s}%,descripcion.ilike.%${s}%,marca.ilike.%${s}%,modelo.ilike.%${s}%,numero_serie.ilike.%${s}%`
      );
    }
  }
  return query;
}

export async function listActivos(params: ListActivosParams = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("activos").select("*", { count: "exact" });
  query = applyListFilters(query, params);
  query = query.order("id_consecutivo", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const [clasifMap, ctaMap] = await Promise.all([getClasificacionMap(), getCtaContableMap()]);

  const items = (data || []).map((row: any) => ({
    id: String(row.id_consecutivo),
    numeroInventario: row.numero_inventario,
    descripcion: row.descripcion,
    marca: row.marca,
    modelo: row.modelo,
    numeroSerie: row.numero_serie,
    clasificacion: row.clasificacion ? String(row.clasificacion) : "",
    clasificacionNombre: row.clasificacion ? clasifMap.get(row.clasificacion) : undefined,
    idCuentaContable: row.id_cta_contable ? String(row.id_cta_contable) : "",
    cuentaContableNombre: row.id_cta_contable ? ctaMap.get(row.id_cta_contable)?.cta_contable : undefined,
    cuentaContableDescripcion: row.id_cta_contable ? ctaMap.get(row.id_cta_contable)?.descripcion : undefined,
    costo: row.costo || 0,
    fechaAlta: row.f_alta ? String(row.f_alta).substring(0, 10) : "",
    fechaFactura: row.f_factura ? String(row.f_factura).substring(0, 10) : "",
    folioFactura: row.folio_factura,
    estatus: ESTATUS_MAP[row.estatus] ?? "ACTIVO",
    tipo: row.tipo,
    ultimoNomina: row.ultimo_nomina,
    observaciones: row.observaciones,
  }));

  return { data: { items, total: count ?? items.length, page, pageSize } };
}

// ============= TOTAL COSTO =============

interface TotalCostoParams {
  tipo?: number;
  search?: string;
  clasificacion?: number;
  estatus?: number;
  sinResguardante?: boolean;
}

export async function getTotalCostoActivos(params: TotalCostoParams = {}): Promise<number> {
  let query = supabase.from("activos").select("costo").range(...UNBOUNDED_RANGE);
  query = applyListFilters(query, params);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).reduce((sum: number, r: any) => sum + (Number(r.costo) || 0), 0);
}

// ============= CRUD =============

export async function createActivo(dto: any): Promise<ApiResponse<any>> {
  const { data, error } = await supabase
    .from("activos")
    .insert({
      numero_inventario: dto.numeroInventario,
      descripcion: dto.descripcion,
      marca: dto.marca || null,
      modelo: dto.modelo || null,
      numero_serie: dto.numeroSerie || null,
      clasificacion: dto.clasificacion || null,
      id_cta_contable: dto.idCuentaContable ? parseInt(dto.idCuentaContable) : null,
      costo: dto.costo || null,
      f_alta: dto.fechaAlta || new Date().toISOString(),
      f_factura: dto.fechaFactura || null,
      folio_factura: dto.folioFactura || null,
      estatus: 1,
      tipo: dto.tipo,
      observaciones: dto.observaciones || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  logAuditEvent("activos", String(data.id_consecutivo), "CREATE", null, null, dto.numeroInventario);

  return { data };
}

export async function updateActivo(id: string, dto: any): Promise<ApiResponse<any>> {
  const { data: prev } = await supabase.from("activos").select("estatus").eq("id_consecutivo", Number(id)).maybeSingle();

  const update: Record<string, any> = {};
  if (dto.descripcion !== undefined) update.descripcion = dto.descripcion;
  if (dto.marca !== undefined) update.marca = dto.marca;
  if (dto.modelo !== undefined) update.modelo = dto.modelo;
  if (dto.numeroSerie !== undefined) update.numero_serie = dto.numeroSerie;
  if (dto.clasificacion !== undefined) update.clasificacion = dto.clasificacion ? parseInt(dto.clasificacion) : null;
  if (dto.idCuentaContable !== undefined) update.id_cta_contable = dto.idCuentaContable ? parseInt(dto.idCuentaContable) : null;
  if (dto.costo !== undefined) update.costo = dto.costo;
  if (dto.fechaFactura !== undefined) update.f_factura = dto.fechaFactura || null;
  if (dto.folioFactura !== undefined) update.folio_factura = dto.folioFactura || null;
  if (dto.observaciones !== undefined) update.observaciones = dto.observaciones || null;
  if (dto.estatus !== undefined) update.estatus = ESTATUS_REVERSE_MAP[dto.estatus] ?? 1;

  const { data, error } = await supabase.from("activos").update(update as never).eq("id_consecutivo", Number(id)).select().single();
  if (error) throw new Error(error.message);

  if (prev && dto.estatus !== undefined) {
    const prevStatStr = prev.estatus != null ? ESTATUS_MAP[prev.estatus] ?? String(prev.estatus) : null;
    if (prevStatStr !== dto.estatus) {
      logAuditEvent("activos", id, "UPDATE", "estatus", prevStatStr, dto.estatus);
    }
  }

  return { data };
}

export async function deleteActivo(id: string): Promise<ApiResponse<void>> {
  const { data: prev } = await supabase.from("activos").select("numero_inventario").eq("id_consecutivo", Number(id)).maybeSingle();
  const { error } = await supabase.from("activos").update({ estatus: 0 }).eq("id_consecutivo", Number(id));
  if (error) throw new Error(error.message);

  logAuditEvent("activos", id, "DELETE", null, prev?.numero_inventario || "", null);

  return { data: null };
}

export async function listActivosByUltimoNomina(
  ultimoNomina: string,
  tipo?: number
): Promise<ApiResponse<{ items: any[] }>> {
  let query = supabase
    .from("activos")
    .select("*")
    .eq("ultimo_nomina", ultimoNomina)
    .neq("estatus", 0)
    .order("numero_inventario");
  if (tipo !== undefined) query = query.eq("tipo", tipo);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const [clasifMap, ctaMap] = await Promise.all([getClasificacionMap(), getCtaContableMap()]);

  const items = (data || []).map((row: any) => ({
    id: String(row.id_consecutivo),
    numeroInventario: row.numero_inventario,
    descripcion: row.descripcion,
    marca: row.marca,
    modelo: row.modelo,
    numeroSerie: row.numero_serie,
    clasificacion: row.clasificacion ? String(row.clasificacion) : "",
    clasificacionNombre: row.clasificacion ? clasifMap.get(row.clasificacion) : undefined,
    idCuentaContable: row.id_cta_contable ? String(row.id_cta_contable) : "",
    cuentaContableNombre: row.id_cta_contable ? ctaMap.get(row.id_cta_contable)?.cta_contable : undefined,
    costo: row.costo || 0,
    estatus: ESTATUS_MAP[row.estatus] ?? "ACTIVO",
    tipo: row.tipo,
  }));

  return { data: { items } };
}

// ============= PRE-BAJA =============

export async function marcarPreBaja(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from("activos")
    .update({ estatus: 3 })
    .in("id_consecutivo", ids.map(Number))
    .eq("estatus", 1);
  if (error) throw new Error(error.message);

  ids.forEach((id) => logAuditEvent("activos", id, "UPDATE", "estatus", "ACTIVO", "PRE-BAJA"));
}

export async function reactivarDesdePreBaja(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from("activos")
    .update({ estatus: 1 })
    .in("id_consecutivo", ids.map(Number))
    .eq("estatus", 3);
  if (error) throw new Error(error.message);

  ids.forEach((id) => logAuditEvent("activos", id, "UPDATE", "estatus", "PRE-BAJA", "ACTIVO"));
}

export async function confirmarBajaDefinitiva(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from("activos")
    .update({ estatus: 0 })
    .in("id_consecutivo", ids.map(Number))
    .eq("estatus", 3);
  if (error) throw new Error(error.message);

  ids.forEach((id) => logAuditEvent("activos", id, "DELETE", "estatus", "PRE-BAJA", "BAJA"));
}

// ============= HISTORIAL =============

export interface AssetHistoryItem {
  fecha: string;
  tipo: string;
  usuario: string;
  detalle: string;
  realizadoPor: string;
}

export async function getAssetHistory(numeroInventario: string): Promise<ApiResponse<{ items: AssetHistoryItem[] }>> {
  const { data: rows, error } = await supabase
    .from("resguardos")
    .select("*")
    .eq("numero_inventario", numeroInventario)
    .order("fecha", { ascending: false });
  if (error) throw new Error(error.message);

  const userIds = [...new Set((rows || []).map((r: any) => r.id_usuario).filter(Boolean))];
  const userMap = new Map<number, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase.from("usuarios").select("id_usuario, nombre").in("id_usuario", userIds);
    (users || []).forEach((u: any) => userMap.set(u.id_usuario, u.nombre || "Sistema"));
  }

  const items = (rows || []).map((row: any) => ({
    fecha: row.fecha,
    tipo: row.estatus ? "Resguardo Vigente" : "Resguardo Histórico",
    usuario: row.nomina || "Sistema",
    detalle: `Folio: ${row.folio}`,
    realizadoPor: row.id_usuario ? userMap.get(row.id_usuario) || "Sistema" : "Sistema",
  }));

  return { data: { items } };
}

// ============= VALIDACIÓN =============

export async function checkNumeroInventarioExists(numeroInventario: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from("activos")
    .select("id_consecutivo", { count: "exact", head: true })
    .eq("numero_inventario", numeroInventario)
    .neq("estatus", 0);
  if (excludeId) query = query.neq("id_consecutivo", Number(excludeId));

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
