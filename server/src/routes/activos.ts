import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../db";
import { requireAuth, hasModuloAccess } from "../middleware/auth";
import { emitChange } from "../realtime";

const router = Router();

// activos sirve dos módulos distintos según `tipo` (1 = bienes-muebles, 2 = enseres)
// — requireModulo por sí solo no alcanza porque la clave depende del request.
const TIPO_CLAVE: Record<number, string> = { 1: "bienes-muebles", 2: "enseres" };

function requireActivoModulo(needsEdit: boolean) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: "No autorizado" }); return; }
    if (req.user.permisos === 1) { next(); return; }

    try {
      let tipo: number | undefined;
      if (req.body?.tipo !== undefined) tipo = Number(req.body.tipo);
      else if (req.query?.tipo !== undefined) tipo = Number(req.query.tipo);

      if (tipo === undefined && req.params?.id) {
        const { rows } = await pool.query("SELECT tipo FROM activos WHERE id_consecutivo = $1", [parseInt(req.params.id)]);
        tipo = rows[0]?.tipo;
      }

      if (tipo === undefined && Array.isArray(req.body?.ids) && req.body.ids.length > 0) {
        const { rows } = await pool.query(
          "SELECT DISTINCT tipo FROM activos WHERE id_consecutivo = ANY($1)",
          [req.body.ids.map(Number)]
        );
        for (const row of rows) {
          const clave = TIPO_CLAVE[row.tipo];
          if (!clave || !(await hasModuloAccess(req.user.id, clave, needsEdit))) {
            res.status(403).json({ error: "Sin acceso al módulo" });
            return;
          }
        }
        next();
        return;
      }

      if (tipo === undefined) {
        // sin filtro de tipo (lecturas generales): basta con acceso de vista a alguno de los dos
        const okMuebles = await hasModuloAccess(req.user.id, "bienes-muebles", needsEdit);
        const okEnseres = await hasModuloAccess(req.user.id, "enseres", needsEdit);
        if (!okMuebles && !okEnseres) { res.status(403).json({ error: "Sin acceso al módulo" }); return; }
        next();
        return;
      }

      const clave = TIPO_CLAVE[tipo];
      if (!clave) { res.status(400).json({ error: "Tipo de activo inválido" }); return; }
      if (!(await hasModuloAccess(req.user.id, clave, needsEdit))) {
        res.status(403).json({ error: "Sin acceso al módulo" });
        return;
      }
      next();
    } catch (err) {
      console.error("[requireActivoModulo] Error:", err);
      res.status(500).json({ error: "Error verificando permisos" });
    }
  };
}

// Normalize DB values to a stable audit string for comparison
function toAuditStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString().substring(0, 10);
  const s = String(val).trim();
  if (s === "") return null;
  // Normalize numbers so "5000.00" and 5000 compare equal
  const n = Number(s);
  if (!isNaN(n)) return String(n);
  return s;
}

// Helper: insert a single audit_log row
async function auditLog(
  tabla: string,
  registroId: string,
  accion: string,
  campo: string | null,
  valorAnterior: string | null,
  valorNuevo: string | null,
  user: { id: number; usuario: string; nombre: string },
  ip: string | undefined
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_logs
       (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo,
        id_usuario, usuario, nombre_usuario, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [tabla, registroId, accion, campo, valorAnterior, valorNuevo,
     user.id, user.usuario, user.nombre, ip || null]
  );
}

// GET /api/activos — lista paginada con filtros
router.get("/", requireAuth, requireActivoModulo(false), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tipo,
      search,
      page = "1",
      pageSize = "50",
      clasificacion,
      estatus,
      sinResguardante,
    } = req.query as Record<string, string>;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const offset = (pageNum - 1) * pageSizeNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (tipo !== undefined) { conditions.push(`a.tipo = $${i++}`); params.push(parseInt(tipo)); }
    if (clasificacion !== undefined) { conditions.push(`a.clasificacion = $${i++}`); params.push(parseInt(clasificacion)); }
    if (estatus !== undefined) {
      conditions.push(`a.estatus = $${i++}`);
      params.push(parseInt(estatus));
    } else {
      conditions.push(`a.estatus != 0`); // excluir bajas por defecto
    }
    if (sinResguardante === "true") { conditions.push(`a.ultimo_nomina IS NULL`); }
    if (search) {
      conditions.push(
        `(a.numero_inventario ILIKE $${i} OR a.descripcion ILIKE $${i} OR a.marca ILIKE $${i} OR a.modelo ILIKE $${i} OR a.numero_serie ILIKE $${i})`
      );
      params.push(`%${search}%`);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM activos a ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      `SELECT a.*,
              c.clasificacion AS clasificacion_nombre,
              ct.cta_contable, ct.descripcion AS cta_descripcion
       FROM activos a
       LEFT JOIN clasificacion c ON c.id_clasificacion = a.clasificacion
       LEFT JOIN ctas_contables ct ON ct.id_ctacontable = a.id_cta_contable
       ${where}
       ORDER BY a.id_consecutivo DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, pageSizeNum, offset]
    );

    const estatusMap: Record<number, string> = { 1: "ACTIVO", 0: "BAJA", 2: "ALMACEN", 3: "PRE-BAJA" };

    const items = dataResult.rows.map((row) => ({
      id: String(row.id_consecutivo),
      numeroInventario: row.numero_inventario,
      descripcion: row.descripcion,
      marca: row.marca,
      modelo: row.modelo,
      numeroSerie: row.numero_serie,
      clasificacion: row.clasificacion ? String(row.clasificacion) : "",
      clasificacionNombre: row.clasificacion_nombre,
      idCuentaContable: row.id_cta_contable ? String(row.id_cta_contable) : "",
      cuentaContableNombre: row.cta_contable,
      cuentaContableDescripcion: row.cta_descripcion,
      costo: row.costo || 0,
      fechaAlta: row.f_alta ? (row.f_alta instanceof Date ? row.f_alta.toISOString() : String(row.f_alta)).substring(0, 10) : "",
      fechaFactura: row.f_factura ? (row.f_factura instanceof Date ? row.f_factura.toISOString() : String(row.f_factura)).substring(0, 10) : "",
      folioFactura: row.folio_factura,
      estatus: estatusMap[row.estatus] ?? "ACTIVO",
      tipo: row.tipo,
      ultimoNomina: row.ultimo_nomina,
      observaciones: row.observaciones,
    }));

    res.json({ data: { items, total, page: pageNum, pageSize: pageSizeNum } });
  } catch (err) {
    console.error("listActivos error:", err);
    res.status(500).json({ error: "Error al obtener activos" });
  }
});

// GET /api/activos/reporte — todos los activos para exportar (sin paginar)
router.get("/reporte", requireAuth, requireActivoModulo(false), async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo, sinAsignar, fechaInicio, fechaFin } = req.query as Record<string, string>;

    const conditions: string[] = ["estatus != 0"];
    const params: unknown[] = [];
    let i = 1;

    if (tipo !== undefined) { conditions.push(`tipo = $${i++}`); params.push(parseInt(tipo)); }
    if (sinAsignar === "true") { conditions.push(`ultimo_nomina IS NULL`); conditions.push(`estatus = 1`); }
    if (fechaInicio) { conditions.push(`f_alta >= $${i++}`); params.push(fechaInicio); }
    if (fechaFin) { conditions.push(`f_alta <= $${i++}`); params.push(fechaFin); }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const { rows } = await pool.query(
      `SELECT numero_inventario, descripcion, marca, modelo, numero_serie,
              f_alta, f_factura, costo, folio_factura, observaciones, ultimo_nomina, clasificacion
       FROM activos ${where}
       ORDER BY numero_inventario`,
      params
    );

    const items = rows.map((row) => ({
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

    res.json({ data: items });
  } catch (err) {
    console.error("reporte activos error:", err);
    res.status(500).json({ error: "Error al obtener reporte" });
  }
});

// GET /api/activos/total-costo — suma de costos con filtros
router.get("/total-costo", requireAuth, requireActivoModulo(false), async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo, search, clasificacion, estatus, sinResguardante } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (tipo !== undefined) { conditions.push(`tipo = $${i++}`); params.push(parseInt(tipo)); }
    if (clasificacion !== undefined) { conditions.push(`clasificacion = $${i++}`); params.push(parseInt(clasificacion)); }
    if (estatus !== undefined) {
      conditions.push(`estatus = $${i++}`);
      params.push(parseInt(estatus));
    } else {
      conditions.push(`estatus != 0`);
    }
    if (sinResguardante === "true") { conditions.push(`ultimo_nomina IS NULL`); }
    if (search) {
      conditions.push(
        `(numero_inventario ILIKE $${i} OR descripcion ILIKE $${i} OR marca ILIKE $${i} OR modelo ILIKE $${i} OR numero_serie ILIKE $${i})`
      );
      params.push(`%${search}%`);
      i++;
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const { rows } = await pool.query(`SELECT COALESCE(SUM(costo), 0) AS total FROM activos ${where}`, params);

    res.json({ data: parseFloat(rows[0].total) });
  } catch (err) {
    console.error("total-costo error:", err);
    res.status(500).json({ error: "Error al calcular total" });
  }
});

// GET /api/activos/por-nomina/:nomina
router.get("/por-nomina/:nomina", requireAuth, requireActivoModulo(false), async (req: Request, res: Response): Promise<void> => {
  try {
    const { nomina } = req.params;
    const { tipo } = req.query as Record<string, string>;

    const conditions = ["a.ultimo_nomina = $1", "a.estatus != 0"];
    const params: unknown[] = [nomina];
    let i = 2;

    if (tipo !== undefined) { conditions.push(`a.tipo = $${i++}`); params.push(parseInt(tipo)); }

    const { rows } = await pool.query(
      `SELECT a.*,
              c.clasificacion AS clasificacion_nombre,
              ct.cta_contable
       FROM activos a
       LEFT JOIN clasificacion c ON c.id_clasificacion = a.clasificacion
       LEFT JOIN ctas_contables ct ON ct.id_ctacontable = a.id_cta_contable
       WHERE ${conditions.join(" AND ")}
       ORDER BY a.numero_inventario`,
      params
    );

    const estatusMap: Record<number, string> = { 1: "ACTIVO", 0: "BAJA", 2: "ALMACEN", 3: "PRE-BAJA" };
    const items = rows.map((row) => ({
      id: String(row.id_consecutivo),
      numeroInventario: row.numero_inventario,
      descripcion: row.descripcion,
      marca: row.marca,
      modelo: row.modelo,
      numeroSerie: row.numero_serie,
      clasificacion: row.clasificacion ? String(row.clasificacion) : "",
      clasificacionNombre: row.clasificacion_nombre,
      idCuentaContable: row.id_cta_contable ? String(row.id_cta_contable) : "",
      cuentaContableNombre: row.cta_contable,
      costo: row.costo || 0,
      estatus: estatusMap[row.estatus] ?? "ACTIVO",
      tipo: row.tipo,
    }));

    res.json({ data: { items } });
  } catch (err) {
    console.error("por-nomina error:", err);
    res.status(500).json({ error: "Error al obtener activos por nómina" });
  }
});

// GET /api/activos/conteo-por-nomina — bienes activos agrupados por último resguardante
router.get("/conteo-por-nomina", requireAuth, requireActivoModulo(false), async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(`
      SELECT ultimo_nomina AS nomina, COUNT(*) AS total_bienes
        FROM activos
       WHERE estatus != 0 AND ultimo_nomina IS NOT NULL AND ultimo_nomina != ''
       GROUP BY ultimo_nomina
       ORDER BY COUNT(*) DESC
    `);
    res.json({ data: rows.map((r) => ({ nomina: r.nomina, totalBienes: parseInt(r.total_bienes) })) });
  } catch (err) {
    console.error("conteo-por-nomina error:", err);
    res.status(500).json({ error: "Error al obtener conteo por nómina" });
  }
});

// GET /api/activos/check-inventario?numero=XX&excludeId=YY
router.get("/check-inventario", requireAuth, requireActivoModulo(false), async (req: Request, res: Response): Promise<void> => {
  try {
    const { numero, excludeId } = req.query as Record<string, string>;
    const params: unknown[] = [numero];
    let sql = "SELECT id_consecutivo FROM activos WHERE numero_inventario = $1 AND estatus != 0";
    if (excludeId) { sql += " AND id_consecutivo != $2"; params.push(parseInt(excludeId)); }
    sql += " LIMIT 1";
    const { rows } = await pool.query(sql, params);
    res.json({ data: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "Error al verificar número de inventario" });
  }
});

// GET /api/activos/historia?numero=XX
router.get("/historia", requireAuth, requireActivoModulo(false), async (req: Request, res: Response): Promise<void> => {
  try {
    const numInv = req.query.numero as string;
    if (!numInv) { res.status(400).json({ error: "Falta parámetro numero" }); return; }
    const { rows } = await pool.query(
      "SELECT * FROM resguardos WHERE numero_inventario = $1 ORDER BY fecha DESC",
      [numInv]
    );

    const userIds = [...new Set(rows.map((r) => r.id_usuario).filter(Boolean))];
    const userMap = new Map<number, string>();
    if (userIds.length > 0) {
      const uRes = await pool.query(
        `SELECT id_usuario, nombre FROM usuarios WHERE id_usuario = ANY($1)`,
        [userIds]
      );
      uRes.rows.forEach((u) => userMap.set(u.id_usuario, u.nombre || "Sistema"));
    }

    const items = rows.map((row) => ({
      fecha: row.fecha,
      tipo: row.estatus ? "Resguardo Vigente" : "Resguardo Histórico",
      usuario: row.nomina || "Sistema",
      detalle: `Folio: ${row.folio}`,
      realizadoPor: row.id_usuario ? (userMap.get(row.id_usuario) || "Sistema") : "Sistema",
    }));

    res.json({ data: { items } });
  } catch (err) {
    console.error("historia error:", err);
    res.status(500).json({ error: "Error al obtener historial" });
  }
});

// POST /api/activos
router.post("/", requireAuth, requireActivoModulo(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const dto = req.body;
    const { rows } = await pool.query(
      `INSERT INTO activos
         (numero_inventario, descripcion, marca, modelo, numero_serie, clasificacion,
          id_cta_contable, costo, f_alta, f_factura, folio_factura, estatus, tipo, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,$12,$13)
       RETURNING *`,
      [
        dto.numeroInventario,
        dto.descripcion,
        dto.marca || null,
        dto.modelo || null,
        dto.numeroSerie || null,
        dto.clasificacion || null,
        dto.idCuentaContable ? parseInt(dto.idCuentaContable) : null,
        dto.costo || null,
        dto.fechaAlta || new Date().toISOString(),
        dto.fechaFactura || null,
        dto.folioFactura || null,
        dto.tipo,
        dto.observaciones || null,
      ]
    );

    const newId = rows[0]?.id_consecutivo;
    if (newId) {
      await auditLog("activos", String(newId), "CREATE", null, null,
        dto.numeroInventario, req.user!, req.ip);
    }

    emitChange("activos", "create", newId);
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error("createActivo error:", err);
    res.status(500).json({ error: "Error al crear activo" });
  }
});

// PATCH /api/activos/:id
router.patch("/:id", requireAuth, requireActivoModulo(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const dto = req.body;

    // Capturar estado previo para auditoría
    const { rows: prevRows } = await pool.query(
      "SELECT * FROM activos WHERE id_consecutivo = $1", [id]
    );
    const prev = prevRows[0];

    const setCols: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    const estatusMap: Record<string, number> = { ACTIVO: 1, BAJA: 0, ALMACEN: 2, "PRE-BAJA": 3 };
    const estatusStrMap: Record<number, string> = { 1: "ACTIVO", 0: "BAJA", 2: "ALMACEN", 3: "PRE-BAJA" };

    if (dto.descripcion !== undefined) { setCols.push(`descripcion = $${i++}`); params.push(dto.descripcion); }
    if (dto.marca !== undefined) { setCols.push(`marca = $${i++}`); params.push(dto.marca); }
    if (dto.modelo !== undefined) { setCols.push(`modelo = $${i++}`); params.push(dto.modelo); }
    if (dto.numeroSerie !== undefined) { setCols.push(`numero_serie = $${i++}`); params.push(dto.numeroSerie); }
    if (dto.clasificacion !== undefined) { setCols.push(`clasificacion = $${i++}`); params.push(dto.clasificacion ? parseInt(dto.clasificacion) : null); }
    if (dto.idCuentaContable !== undefined) { setCols.push(`id_cta_contable = $${i++}`); params.push(dto.idCuentaContable ? parseInt(dto.idCuentaContable) : null); }
    if (dto.costo !== undefined) { setCols.push(`costo = $${i++}`); params.push(dto.costo); }
    if (dto.fechaFactura !== undefined) { setCols.push(`f_factura = $${i++}`); params.push(dto.fechaFactura || null); }
    if (dto.folioFactura !== undefined) { setCols.push(`folio_factura = $${i++}`); params.push(dto.folioFactura || null); }
    if (dto.observaciones !== undefined) { setCols.push(`observaciones = $${i++}`); params.push(dto.observaciones || null); }
    if (dto.estatus !== undefined) { setCols.push(`estatus = $${i++}`); params.push(estatusMap[dto.estatus] ?? 1); }

    if (setCols.length === 0) { res.status(400).json({ error: "Sin campos para actualizar" }); return; }

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE activos SET ${setCols.join(", ")} WHERE id_consecutivo = $${i} RETURNING *`,
      params
    );

    // Auditar campo por campo
    if (prev) {
      const fieldMap: Array<[string, string]> = [
        ["descripcion", "descripcion"],
        ["marca", "marca"],
        ["modelo", "modelo"],
        ["numeroSerie", "numero_serie"],
        ["clasificacion", "clasificacion"],
        ["idCuentaContable", "id_cta_contable"],
        ["costo", "costo"],
        ["fechaFactura", "f_factura"],
        ["folioFactura", "folio_factura"],
        ["observaciones", "observaciones"],
      ];

      const logInserts: Promise<void>[] = [];
      for (const [dtoKey, dbCol] of fieldMap) {
        if (dto[dtoKey] === undefined) continue;
        const prevStr = toAuditStr(prev[dbCol]);
        const newStr = toAuditStr(dto[dtoKey]);
        if (prevStr !== newStr) {
          logInserts.push(auditLog("activos", String(id), "UPDATE", dbCol, prevStr, newStr, req.user!, req.ip));
        }
      }
      // Estatus por separado (conversión número ↔ string)
      if (dto.estatus !== undefined) {
        const prevStatStr = prev.estatus !== null ? (estatusStrMap[prev.estatus] ?? String(prev.estatus)) : null;
        if (prevStatStr !== dto.estatus) {
          logInserts.push(auditLog("activos", String(id), "UPDATE", "estatus", prevStatStr, dto.estatus, req.user!, req.ip));
        }
      }
      await Promise.all(logInserts);
    }

    emitChange("activos", "update", id);
    res.json({ data: rows[0] });
  } catch (err) {
    console.error("updateActivo error:", err);
    res.status(500).json({ error: "Error al actualizar activo" });
  }
});

// DELETE /api/activos/:id — baja lógica
router.delete("/:id", requireAuth, requireActivoModulo(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { rows: prevRows } = await pool.query(
      "SELECT numero_inventario FROM activos WHERE id_consecutivo = $1", [id]
    );
    const numInv = prevRows[0]?.numero_inventario || "";

    await pool.query("UPDATE activos SET estatus = 0 WHERE id_consecutivo = $1", [id]);

    await auditLog("activos", String(id), "DELETE", null, numInv, null, req.user!, req.ip);

    emitChange("activos", "delete", id);
    res.json({ data: null });
  } catch (err) {
    console.error("deleteActivo error:", err);
    res.status(500).json({ error: "Error al dar de baja activo" });
  }
});

// POST /api/activos/pre-baja
router.post("/pre-baja", requireAuth, requireActivoModulo(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body as { ids: string[] };
    await pool.query(
      "UPDATE activos SET estatus = 3 WHERE id_consecutivo = ANY($1) AND estatus = 1",
      [ids.map(Number)]
    );

    const logInserts = ids.map((id) =>
      auditLog("activos", String(id), "UPDATE", "estatus", "ACTIVO", "PRE-BAJA", req.user!, req.ip)
    );
    await Promise.all(logInserts);

    emitChange("activos", "update");
    res.json({ data: null });
  } catch (err) {
    res.status(500).json({ error: "Error al marcar pre-baja" });
  }
});

// POST /api/activos/reactivar
router.post("/reactivar", requireAuth, requireActivoModulo(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body as { ids: string[] };
    await pool.query(
      "UPDATE activos SET estatus = 1 WHERE id_consecutivo = ANY($1) AND estatus = 3",
      [ids.map(Number)]
    );

    const logInserts = ids.map((id) =>
      auditLog("activos", String(id), "UPDATE", "estatus", "PRE-BAJA", "ACTIVO", req.user!, req.ip)
    );
    await Promise.all(logInserts);

    emitChange("activos", "update");
    res.json({ data: null });
  } catch (err) {
    res.status(500).json({ error: "Error al reactivar activos" });
  }
});

// POST /api/activos/baja-definitiva
router.post("/baja-definitiva", requireAuth, requireActivoModulo(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body as { ids: string[] };
    await pool.query(
      "UPDATE activos SET estatus = 0 WHERE id_consecutivo = ANY($1) AND estatus = 3",
      [ids.map(Number)]
    );

    const logInserts = ids.map((id) =>
      auditLog("activos", String(id), "DELETE", "estatus", "PRE-BAJA", "BAJA", req.user!, req.ip)
    );
    await Promise.all(logInserts);

    emitChange("activos", "delete");
    res.json({ data: null });
  } catch (err) {
    res.status(500).json({ error: "Error en baja definitiva" });
  }
});

export default router;
