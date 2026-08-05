import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  bienesMuebles: number;
  enseres: number;
  bienesInmuebles: number;
  resguardosActivos: number;
  resguardosMuebles: number;
  resguardosEnseres: number;
  valorMuebles: number;
  valorEnseres: number;
}

export interface ActividadReciente {
  tipo: "resguardo" | "activo";
  descripcion: string;
  fecha: string;
  detalle?: string;
}

export interface PatrimonioMensual {
  mes: string; // "ene 2026"
  open: number;
  high: number;
  low: number;
  close: number;
  altas: number;
}

export interface EstatusDistribucionItem {
  estatus: "Activo" | "Almacén" | "Pre-Baja";
  cantidad: number;
}

export interface ClasificacionTopItem {
  nombre: string;
  cantidad: number;
}

async function countActivos(filters: (q: any) => any): Promise<number> {
  let query = supabase.from("activos").select("id_consecutivo", { count: "exact", head: true });
  query = filters(query);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function sumCosto(tipo: number): Promise<number> {
  const { data, error } = await supabase
    .from("activos")
    .select("costo")
    .eq("tipo", tipo)
    .neq("estatus", 0)
    .range(0, 49999);
  if (error) throw new Error(error.message);
  return (data || []).reduce((s: number, r: any) => s + (Number(r.costo) || 0), 0);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const resguardadoFilter = (q: any) =>
    q.neq("estatus", 0).not("ultimo_nomina", "is", null).neq("ultimo_nomina", "");

  const [
    bienesMuebles,
    enseres,
    bienesInmuebles,
    resguardosActivos,
    resguardosMuebles,
    resguardosEnseres,
    valorMuebles,
    valorEnseres,
  ] = await Promise.all([
    countActivos((q) => q.eq("tipo", 1).neq("estatus", 0)),
    countActivos((q) => q.eq("tipo", 2).neq("estatus", 0)),
    (async () => {
      const { count, error } = await supabase
        .from("bienes_inmuebles")
        .select("id", { count: "exact", head: true })
        .neq("estatus", 0);
      if (error) throw new Error(error.message);
      return count ?? 0;
    })(),
    countActivos((q) => resguardadoFilter(q).in("tipo", [1, 2])),
    countActivos((q) => resguardadoFilter(q).eq("tipo", 1)),
    countActivos((q) => resguardadoFilter(q).eq("tipo", 2)),
    sumCosto(1),
    sumCosto(2),
  ]);

  return {
    bienesMuebles,
    enseres,
    bienesInmuebles,
    resguardosActivos,
    resguardosMuebles,
    resguardosEnseres,
    valorMuebles,
    valorEnseres,
  };
}

export async function getActividadReciente(): Promise<ActividadReciente[]> {
  const [{ data: resguardosData, error: rErr }, { data: activosData, error: aErr }] = await Promise.all([
    supabase
      .from("resguardos")
      .select("folio, nomina, fecha, numero_inventario")
      .eq("estatus", true)
      .order("fecha", { ascending: false })
      .limit(10),
    supabase
      .from("activos")
      .select("numero_inventario, descripcion, f_alta")
      .neq("estatus", 0)
      .order("id_consecutivo", { ascending: false })
      .limit(3),
  ]);
  if (rErr) throw new Error(rErr.message);
  if (aErr) throw new Error(aErr.message);

  const actividades: ActividadReciente[] = [];
  const foliosVistos = new Set<string>();

  for (const r of resguardosData || []) {
    if (r.folio && !foliosVistos.has(r.folio)) {
      foliosVistos.add(r.folio);
      actividades.push({
        tipo: "resguardo",
        descripcion: `Resguardo asignado a nómina ${r.nomina || "N/A"}`,
        fecha: r.fecha || "",
        detalle: r.numero_inventario || undefined,
      });
    }
    if (foliosVistos.size >= 3) break;
  }

  for (const a of activosData || []) {
    const desc = a.descripcion || "Sin descripción";
    actividades.push({
      tipo: "activo",
      descripcion: `Nuevo activo: ${desc.substring(0, 40)}${desc.length > 40 ? "..." : ""}`,
      fecha: a.f_alta || "",
      detalle: a.numero_inventario || undefined,
    });
  }

  actividades.sort((a, b) => {
    const da = a.fecha ? new Date(a.fecha).getTime() : 0;
    const db = b.fecha ? new Date(b.fecha).getTime() : 0;
    return db - da;
  });

  return actividades.slice(0, 5);
}

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/**
 * Altas de bienes por mes (últimos N meses), agregadas en formato OHLC
 * (apertura/máximo/mínimo/cierre del costo de los bienes dados de alta ese
 * mes) para una gráfica estilo velas del valor patrimonial incorporado.
 */
export async function getPatrimonioMensual(months = 6): Promise<PatrimonioMensual[]> {
  const desde = new Date();
  desde.setMonth(desde.getMonth() - (months - 1));
  desde.setDate(1);
  const desdeStr = desde.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("activos")
    .select("costo, f_alta")
    .neq("estatus", 0)
    .not("f_alta", "is", null)
    .gte("f_alta", desdeStr)
    .order("f_alta", { ascending: true })
    .range(0, 49999);
  if (error) throw new Error(error.message);

  const buckets = new Map<string, { costos: number[]; key: string }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(desde);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { costos: [], key });
  }

  for (const row of data || []) {
    const f = row.f_alta as string;
    if (!f) continue;
    const key = f.slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) bucket.costos.push(Number(row.costo) || 0);
  }

  return Array.from(buckets.values()).map(({ costos, key }) => {
    const [y, m] = key.split("-");
    const mes = `${MESES_CORTOS[Number(m) - 1]} ${y}`;
    if (costos.length === 0) {
      return { mes, open: 0, high: 0, low: 0, close: 0, altas: 0 };
    }
    return {
      mes,
      open: costos[0],
      close: costos[costos.length - 1],
      high: Math.max(...costos),
      low: Math.min(...costos),
      altas: costos.length,
    };
  });
}

/** Distribución de bienes muebles y enseres por estatus operativo (excluye baja). */
export async function getEstatusDistribucion(): Promise<EstatusDistribucionItem[]> {
  const counts = await Promise.all([
    countActivos((q) => q.eq("estatus", 1).in("tipo", [1, 2])),
    countActivos((q) => q.eq("estatus", 2).in("tipo", [1, 2])),
    countActivos((q) => q.eq("estatus", 3).in("tipo", [1, 2])),
  ]);

  return [
    { estatus: "Activo", cantidad: counts[0] },
    { estatus: "Almacén", cantidad: counts[1] },
    { estatus: "Pre-Baja", cantidad: counts[2] },
  ];
}

/** Top N clasificaciones con más bienes registrados. */
export async function getTopClasificaciones(limit = 6): Promise<ClasificacionTopItem[]> {
  const [{ data: activosData, error: aErr }, { data: clasifData, error: cErr }] = await Promise.all([
    supabase.from("activos").select("clasificacion").neq("estatus", 0).range(0, 49999),
    supabase.from("clasificacion").select("id_clasificacion, clasificacion").range(0, 9999),
  ]);
  if (aErr) throw new Error(aErr.message);
  if (cErr) throw new Error(cErr.message);

  const nombreMap = new Map<number, string>();
  (clasifData || []).forEach((r: any) => nombreMap.set(r.id_clasificacion, r.clasificacion));

  const counts = new Map<string, number>();
  for (const row of activosData || []) {
    const id = (row as any).clasificacion;
    if (id == null) continue;
    const nombre = nombreMap.get(id) || `#${id}`;
    counts.set(nombre, (counts.get(nombre) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, limit);
}
