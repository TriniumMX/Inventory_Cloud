import { Clasificacion, CuentaContable, ResguardoRow, Resguardo } from "./types";

// Mapper para convertir datos SQL a modelo Clasificacion
export function mapSqlToClasificacion(row: any): Clasificacion {
  const id = row.id ?? row.Id ?? row.id_clasificacion;
  return {
    id: id != null ? String(id) : "",
    codigo: row.codigo || row.Codigo || (id != null ? String(id) : ""),
    nombre: row.nombre || row.Nombre || row.clasificacion || "",
    descripcion: row.descripcion || row.Descripcion || undefined,
  };
}

// Mapper para convertir datos SQL a modelo CuentaContable
export function mapSqlToCuentaContable(row: any): CuentaContable {
  const id = row.id ?? row.Id ?? row.id_ctacontable;
  return {
    id: id != null ? String(id) : "",
    ctaContable: row.cta_contable || row.ctaContable || "",
    descripcion: row.descripcion || row.Descripcion || "",
    tipo: row.tipo || row.Tipo || undefined,
  };
}

// Mappers para Resguardos

export function mapSqlToResguardoRow(row: any): ResguardoRow {
  return {
    id: row.id || row.Id || "",
    folio: row.folio || row.Folio || "",
    nomina: row.nomina || row.Nomina || "",
    numeroInventario: row.numero_inventario || row.numeroInventario || "",
    estatus: parseInt(row.estatus || row.Estatus || "1"),
    fechaAsignacion: row.fecha_asignacion || row.fechaAsignacion || "",
    fechaDevolucion: row.fecha_devolucion || row.fechaDevolucion || undefined,
    idUsuario: row.id_usuario || row.idUsuario || undefined,
  };
}

export function groupRowsToResguardo(rows: ResguardoRow[], empleadosMap?: Map<string, string>): Resguardo {
  if (rows.length === 0) throw new Error("No rows to group");
  
  const first = rows[0];
  return {
    folio: first.folio,
    nomina: first.nomina,
    nombreEmpleado: empleadosMap?.get(first.nomina) || undefined,
    items: rows.map(r => ({
      numeroInventario: r.numeroInventario,
    })),
    estatus: first.estatus,
    fechaAsignacion: first.fechaAsignacion,
    fechaDevolucion: first.fechaDevolucion,
    totalArticulos: rows.length,
  };
}

// Helper para resolver el tipo de destino de un resguardo
export function resolveResguardoDestino(
  nomina: string,
  empleadosSugeridos?: Array<{ nomina: string; nombre: string }>,
  consignas?: Array<{ id: number; nombre: string }>
): { kind: "Empleado" | "Institucion" | "Indeterminado"; display: string } {
  const nominaNormalizada = nomina.trim();
  
  if (empleadosSugeridos) {
    const empleado = empleadosSugeridos.find(
      e => e.nomina.trim().toLowerCase() === nominaNormalizada.toLowerCase()
    );
    if (empleado) {
      return { kind: "Empleado", display: `${empleado.nombre} (${empleado.nomina})` };
    }
  }
  
  const nominaPattern = /^[A-Z]?\d{3,}$/i;
  if (nominaPattern.test(nominaNormalizada)) {
    return { kind: "Empleado", display: nominaNormalizada };
  }
  
  if (consignas) {
    const institucion = consignas.find(
      c => c.nombre.trim().toLowerCase() === nominaNormalizada.toLowerCase()
    );
    if (institucion) {
      return { kind: "Institucion", display: institucion.nombre };
    }
  }
  
  return { kind: "Indeterminado", display: nominaNormalizada };
}

// Mapper para convertir datos SQL a modelo Activo (utilizado en páginas de BienesMuebles/Enseres)
export function mapSqlToActivo(row: any) {
  return {
    id: row.id || row.Id || "",
    numeroInventario: row.numero_inventario || row.numeroInventario || "",
    descripcion: row.descripcion || row.Descripcion || "",
    marca: row.marca || row.Marca || undefined,
    modelo: row.modelo || row.Modelo || undefined,
    numeroSerie: row.numero_serie || row.numeroSerie || undefined,
    folioFactura: row.folio_factura || row.folioFactura || undefined,
    fechaFactura: row.fecha_factura || row.fechaFactura || undefined,
    fechaAlta: row.fecha_alta || row.fechaAlta || undefined,
    clasificacion: row.clasificacion || row.Clasificacion || "",
    clasificacionCodigo: row.clasificacion_codigo || row.clasificacionCodigo || undefined,
    clasificacionNombre: row.clasificacion_nombre || row.clasificacionNombre || undefined,
    estatus: row.estatus || row.Estatus || "",
    estatusNombre: row.estatus_nombre || row.estatusNombre || undefined,
    costo: parseFloat(row.costo || row.Costo || "0"),
    idCuentaContable: row.id_cuenta_contable || row.idCuentaContable || "",
    ctaContableNombre: row.cuentaContableDescripcion || row.cta_descripcion || row.cta_contable_nombre || row.ctaContableNombre || undefined,
    observaciones: row.observaciones || row.Observaciones || undefined,
    fechaModificacion: row.fecha_modificacion || row.fechaModificacion || undefined,
    ultimoNomina: row.ultimo_nomina || row.ultimoNomina || undefined,
    tipo: row.tipo != null ? Number(row.tipo) : undefined,
  };
}
