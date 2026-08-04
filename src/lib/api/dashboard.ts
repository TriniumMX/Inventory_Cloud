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
