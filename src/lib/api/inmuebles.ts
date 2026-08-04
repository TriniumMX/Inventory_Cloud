import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "../supabaseAudit";

function toAuditStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!isNaN(n)) return String(n);
  return s;
}

export async function listTiposInmueble() {
  const { data, error } = await supabase.from("tipos_inmueble").select("id, nombre, descripcion").order("nombre");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function checkNumeroInventarioInmuebleExists(
  numeroInventario: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from("bienes_inmuebles")
    .select("id", { count: "exact", head: true })
    .eq("numero_inventario", numeroInventario)
    .neq("estatus", 0);
  if (excludeId) query = query.neq("id", Number(excludeId));

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

async function getTipoInmuebleMap(): Promise<Map<number, string>> {
  const { data } = await supabase.from("tipos_inmueble").select("id, nombre");
  const map = new Map<number, string>();
  (data || []).forEach((r: any) => map.set(r.id, r.nombre));
  return map;
}

async function getCtaContableMap(): Promise<Map<number, { cta_contable: string; descripcion: string }>> {
  const { data } = await supabase.from("ctas_contables").select("id_ctacontable, cta_contable, descripcion");
  const map = new Map<number, { cta_contable: string; descripcion: string }>();
  (data || []).forEach((r: any) => map.set(r.id_ctacontable, { cta_contable: r.cta_contable, descripcion: r.descripcion }));
  return map;
}

export async function listBienesInmuebles() {
  const { data, error } = await supabase
    .from("bienes_inmuebles")
    .select("*")
    .neq("estatus", 0)
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);

  const [tipoMap, ctaMap] = await Promise.all([getTipoInmuebleMap(), getCtaContableMap()]);

  return (data || []).map((row: any) => {
    const cta = row.id_cta_contable ? ctaMap.get(row.id_cta_contable) : undefined;
    return {
      id: row.id,
      numeroInventario: row.numero_inventario,
      nombre: row.nombre,
      descripcion: row.descripcion,
      idTipoInmueble: row.id_tipo_inmueble,
      tipoNombre: row.id_tipo_inmueble ? tipoMap.get(row.id_tipo_inmueble) : undefined,
      usoActual: row.uso_actual,
      niveles: row.niveles,
      direccion: row.direccion,
      colonia: row.colonia,
      codigoPostal: row.codigo_postal,
      municipio: row.municipio,
      estado: row.estado,
      latitud: row.latitud,
      longitud: row.longitud,
      superficieTerreno: row.superficie_terreno,
      superficieConstruccion: row.superficie_construccion,
      numeroEscritura: row.numero_escritura,
      fechaEscritura: row.fecha_escritura,
      notaria: row.notaria,
      volumenLibro: row.volumen_libro,
      folioRegistro: row.folio_registro,
      claveCatastral: row.clave_catastral,
      valorCatastral: row.valor_catastral,
      valorComercial: row.valor_comercial,
      costoAdquisicion: row.costo_adquisicion,
      fechaAdquisicion: row.fecha_adquisicion,
      idCuentaContable: row.id_cta_contable,
      ctaContableNombre: cta ? `${cta.cta_contable} - ${cta.descripcion}` : null,
      responsableNomina: row.responsable_nomina,
      estatus: row.estatus,
      observaciones: row.observaciones,
      fechaRegistro: row.fecha_registro,
      fechaModificacion: row.fecha_modificacion,
      escrituraUrl: row.escritura_url,
    };
  });
}

export async function createBienInmueble(dto: Record<string, string | undefined>) {
  const p = (v?: string) => (v && v !== "" ? parseFloat(v) : null);
  const pi = (v?: string) => (v && v !== "" ? parseInt(v) : null);

  const { data, error } = await supabase
    .from("bienes_inmuebles")
    .insert({
      numero_inventario: dto.numeroInventario,
      direccion: dto.direccion,
      id_tipo_inmueble: parseInt(dto.idTipoInmueble!),
      estatus: parseInt(dto.estatus!),
      nombre: dto.nombre || null,
      descripcion: dto.descripcion || null,
      uso_actual: dto.usoActual || null,
      niveles: pi(dto.niveles),
      colonia: dto.colonia || null,
      codigo_postal: dto.codigoPostal || null,
      municipio: dto.municipio || null,
      estado: dto.estado || null,
      latitud: p(dto.latitud),
      longitud: p(dto.longitud),
      superficie_terreno: p(dto.superficieTerreno),
      superficie_construccion: p(dto.superficieConstruccion),
      numero_escritura: dto.numeroEscritura || null,
      fecha_escritura: dto.fechaEscritura || null,
      notaria: dto.notaria || null,
      volumen_libro: dto.volumenLibro || null,
      folio_registro: dto.folioRegistro || null,
      clave_catastral: dto.claveCatastral || null,
      valor_catastral: p(dto.valorCatastral),
      valor_comercial: p(dto.valorComercial),
      costo_adquisicion: p(dto.costoAdquisicion),
      fecha_adquisicion: dto.fechaAdquisicion || null,
      id_cta_contable: pi(dto.idCuentaContable),
      responsable_nomina: dto.responsableNomina || null,
      observaciones: dto.observaciones || null,
      fecha_registro: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  logAuditEvent("bienes_inmuebles", String(data.id), "CREATE", null, null, dto.numeroInventario || null);
}

export async function updateBienInmueble(id: number, dto: Record<string, string | undefined>) {
  const p = (v?: string) => (v && v !== "" ? parseFloat(v) : null);
  const pi = (v?: string) => (v && v !== "" ? parseInt(v) : null);

  const { data: current, error: fetchError } = await supabase
    .from("bienes_inmuebles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !current) throw new Error("Inmueble no encontrado");

  const fieldMap: Record<string, unknown> = {
    numero_inventario: dto.numeroInventario,
    direccion: dto.direccion,
    id_tipo_inmueble: dto.idTipoInmueble !== undefined ? parseInt(dto.idTipoInmueble) : undefined,
    estatus: dto.estatus !== undefined ? parseInt(dto.estatus) : undefined,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    uso_actual: dto.usoActual,
    niveles: dto.niveles !== undefined ? pi(dto.niveles) : undefined,
    colonia: dto.colonia,
    codigo_postal: dto.codigoPostal,
    municipio: dto.municipio,
    estado: dto.estado,
    latitud: dto.latitud !== undefined ? p(dto.latitud) : undefined,
    longitud: dto.longitud !== undefined ? p(dto.longitud) : undefined,
    superficie_terreno: dto.superficieTerreno !== undefined ? p(dto.superficieTerreno) : undefined,
    superficie_construccion: dto.superficieConstruccion !== undefined ? p(dto.superficieConstruccion) : undefined,
    numero_escritura: dto.numeroEscritura,
    fecha_escritura: dto.fechaEscritura,
    notaria: dto.notaria,
    volumen_libro: dto.volumenLibro,
    folio_registro: dto.folioRegistro,
    clave_catastral: dto.claveCatastral,
    valor_catastral: dto.valorCatastral !== undefined ? p(dto.valorCatastral) : undefined,
    valor_comercial: dto.valorComercial !== undefined ? p(dto.valorComercial) : undefined,
    costo_adquisicion: dto.costoAdquisicion !== undefined ? p(dto.costoAdquisicion) : undefined,
    fecha_adquisicion: dto.fechaAdquisicion,
    id_cta_contable: dto.idCuentaContable !== undefined ? pi(dto.idCuentaContable) : undefined,
    responsable_nomina: dto.responsableNomina,
    observaciones: dto.observaciones,
  };

  const update: Record<string, unknown> = {};
  for (const [col, val] of Object.entries(fieldMap)) {
    if (val !== undefined) update[col] = val === "" ? null : val;
  }

  if (Object.keys(update).length === 0) return;

  const { error: updateError } = await supabase.from("bienes_inmuebles").update(update as never).eq("id", id);
  if (updateError) throw new Error(updateError.message);

  for (const [col, newVal] of Object.entries(update)) {
    const prevStr = toAuditStr((current as any)[col]);
    const newStr = toAuditStr(newVal);
    if (prevStr !== newStr) {
      logAuditEvent("bienes_inmuebles", String(id), "UPDATE", col, prevStr, newStr);
    }
  }
}

// ── Storage: Escrituras PDF ──────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ESCRITURAS_BUCKET = "escrituras";

export async function uploadEscritura(inmuebleId: number, numeroInventario: string, file: File): Promise<string> {
  if (file.type !== "application/pdf") throw new Error("Solo se permiten archivos PDF");
  if (file.size > MAX_FILE_SIZE) throw new Error("El archivo excede el tamaño máximo de 10 MB");

  const safeNum = numeroInventario.replace(/[^a-zA-Z0-9-_]/g, "_");
  const fileName = `${safeNum}-escritura.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(ESCRITURAS_BUCKET)
    .upload(fileName, file, { upsert: true, contentType: "application/pdf" });
  if (uploadError) throw new Error(uploadError.message);

  const { error: updateError } = await supabase
    .from("bienes_inmuebles")
    .update({ escritura_url: fileName })
    .eq("id", inmuebleId);
  if (updateError) throw new Error(updateError.message);

  return fileName;
}

export async function deleteEscritura(inmuebleId: number, filePath: string): Promise<void> {
  if (filePath) {
    await supabase.storage.from(ESCRITURAS_BUCKET).remove([filePath]);
  }
  const { error } = await supabase.from("bienes_inmuebles").update({ escritura_url: null }).eq("id", inmuebleId);
  if (error) throw new Error(error.message);
}

export async function getEscrituraSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(ESCRITURAS_BUCKET).createSignedUrl(filePath, 600);
  if (error || !data) throw new Error(error?.message || "No se pudo generar la URL de la escritura");
  return data.signedUrl;
}
