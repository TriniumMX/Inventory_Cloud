"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Normalize DB values to a stable audit string for comparison
function toAuditStr(val) {
    if (val === null || val === undefined)
        return null;
    if (val instanceof Date)
        return val.toISOString().substring(0, 10);
    const s = String(val).trim();
    if (s === "")
        return null;
    // Normalize numbers so "5000.00" and 5000 compare equal
    const n = Number(s);
    if (!isNaN(n))
        return String(n);
    return s;
}
// Helper: insert a single audit_log row
async function auditLog(tabla, registroId, accion, campo, valorAnterior, valorNuevo, user, ip) {
    await db_1.pool.query(`INSERT INTO audit_logs
       (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo,
        id_usuario, usuario, nombre_usuario, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [tabla, registroId, accion, campo, valorAnterior, valorNuevo,
        user.id, user.usuario, user.nombre, ip || null]);
}
// GET /api/activos — lista paginada con filtros
router.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const { tipo, search, page = "1", pageSize = "50", clasificacion, estatus, sinResguardante, } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;
        const conditions = [];
        const params = [];
        let i = 1;
        if (tipo !== undefined) {
            conditions.push(`a.tipo = $${i++}`);
            params.push(parseInt(tipo));
        }
        if (clasificacion !== undefined) {
            conditions.push(`a.clasificacion = $${i++}`);
            params.push(parseInt(clasificacion));
        }
        if (estatus !== undefined) {
            conditions.push(`a.estatus = $${i++}`);
            params.push(parseInt(estatus));
        }
        else {
            conditions.push(`a.estatus != 0`); // excluir bajas por defecto
        }
        if (sinResguardante === "true") {
            conditions.push(`a.ultimo_nomina IS NULL`);
        }
        if (search) {
            conditions.push(`(a.numero_inventario ILIKE $${i} OR a.descripcion ILIKE $${i} OR a.marca ILIKE $${i} OR a.modelo ILIKE $${i} OR a.numero_serie ILIKE $${i})`);
            params.push(`%${search}%`);
            i++;
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const countResult = await db_1.pool.query(`SELECT COUNT(*) FROM activos a ${where}`, params);
        const total = parseInt(countResult.rows[0].count);
        const dataResult = await db_1.pool.query(`SELECT a.*,
              c.clasificacion AS clasificacion_nombre,
              ct.cta_contable, ct.descripcion AS cta_descripcion
       FROM activos a
       LEFT JOIN clasificacion c ON c.id_clasificacion = a.clasificacion
       LEFT JOIN ctas_contables ct ON ct.id_ctacontable = a.id_cta_contable
       ${where}
       ORDER BY a.id_consecutivo DESC
       LIMIT $${i} OFFSET $${i + 1}`, [...params, pageSizeNum, offset]);
        const estatusMap = { 1: "ACTIVO", 0: "BAJA", 2: "ALMACEN", 3: "PRE-BAJA" };
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
    }
    catch (err) {
        console.error("listActivos error:", err);
        res.status(500).json({ error: "Error al obtener activos" });
    }
});
// GET /api/activos/reporte — todos los activos para exportar (sin paginar)
router.get("/reporte", auth_1.requireAuth, async (req, res) => {
    try {
        const { tipo, sinAsignar, fechaInicio, fechaFin } = req.query;
        const conditions = ["estatus != 0"];
        const params = [];
        let i = 1;
        if (tipo !== undefined) {
            conditions.push(`tipo = $${i++}`);
            params.push(parseInt(tipo));
        }
        if (sinAsignar === "true") {
            conditions.push(`ultimo_nomina IS NULL`);
            conditions.push(`estatus = 1`);
        }
        if (fechaInicio) {
            conditions.push(`f_alta >= $${i++}`);
            params.push(fechaInicio);
        }
        if (fechaFin) {
            conditions.push(`f_alta <= $${i++}`);
            params.push(fechaFin);
        }
        const where = `WHERE ${conditions.join(" AND ")}`;
        const { rows } = await db_1.pool.query(`SELECT numero_inventario, descripcion, marca, modelo, numero_serie,
              f_alta, f_factura, costo, folio_factura, observaciones, ultimo_nomina, clasificacion
       FROM activos ${where}
       ORDER BY numero_inventario`, params);
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
    }
    catch (err) {
        console.error("reporte activos error:", err);
        res.status(500).json({ error: "Error al obtener reporte" });
    }
});
// GET /api/activos/total-costo — suma de costos con filtros
router.get("/total-costo", auth_1.requireAuth, async (req, res) => {
    try {
        const { tipo, search, clasificacion, estatus, sinResguardante } = req.query;
        const conditions = [];
        const params = [];
        let i = 1;
        if (tipo !== undefined) {
            conditions.push(`tipo = $${i++}`);
            params.push(parseInt(tipo));
        }
        if (clasificacion !== undefined) {
            conditions.push(`clasificacion = $${i++}`);
            params.push(parseInt(clasificacion));
        }
        if (estatus !== undefined) {
            conditions.push(`estatus = $${i++}`);
            params.push(parseInt(estatus));
        }
        else {
            conditions.push(`estatus != 0`);
        }
        if (sinResguardante === "true") {
            conditions.push(`ultimo_nomina IS NULL`);
        }
        if (search) {
            conditions.push(`(numero_inventario ILIKE $${i} OR descripcion ILIKE $${i} OR marca ILIKE $${i} OR modelo ILIKE $${i} OR numero_serie ILIKE $${i})`);
            params.push(`%${search}%`);
            i++;
        }
        const where = `WHERE ${conditions.join(" AND ")}`;
        const { rows } = await db_1.pool.query(`SELECT COALESCE(SUM(costo), 0) AS total FROM activos ${where}`, params);
        res.json({ data: parseFloat(rows[0].total) });
    }
    catch (err) {
        console.error("total-costo error:", err);
        res.status(500).json({ error: "Error al calcular total" });
    }
});
// GET /api/activos/por-nomina/:nomina
router.get("/por-nomina/:nomina", auth_1.requireAuth, async (req, res) => {
    try {
        const { nomina } = req.params;
        const { tipo } = req.query;
        const conditions = ["a.ultimo_nomina = $1", "a.estatus != 0"];
        const params = [nomina];
        let i = 2;
        if (tipo !== undefined) {
            conditions.push(`a.tipo = $${i++}`);
            params.push(parseInt(tipo));
        }
        const { rows } = await db_1.pool.query(`SELECT a.*,
              c.clasificacion AS clasificacion_nombre,
              ct.cta_contable
       FROM activos a
       LEFT JOIN clasificacion c ON c.id_clasificacion = a.clasificacion
       LEFT JOIN ctas_contables ct ON ct.id_ctacontable = a.id_cta_contable
       WHERE ${conditions.join(" AND ")}
       ORDER BY a.numero_inventario`, params);
        const estatusMap = { 1: "ACTIVO", 0: "BAJA", 2: "ALMACEN", 3: "PRE-BAJA" };
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
    }
    catch (err) {
        console.error("por-nomina error:", err);
        res.status(500).json({ error: "Error al obtener activos por nómina" });
    }
});
// GET /api/activos/check-inventario?numero=XX&excludeId=YY
router.get("/check-inventario", auth_1.requireAuth, async (req, res) => {
    try {
        const { numero, excludeId } = req.query;
        const params = [numero];
        let sql = "SELECT id_consecutivo FROM activos WHERE numero_inventario = $1 AND estatus != 0";
        if (excludeId) {
            sql += " AND id_consecutivo != $2";
            params.push(parseInt(excludeId));
        }
        sql += " LIMIT 1";
        const { rows } = await db_1.pool.query(sql, params);
        res.json({ data: rows.length > 0 });
    }
    catch (err) {
        res.status(500).json({ error: "Error al verificar número de inventario" });
    }
});
// GET /api/activos/historia?numero=XX
router.get("/historia", auth_1.requireAuth, async (req, res) => {
    try {
        const numInv = req.query.numero;
        if (!numInv) {
            res.status(400).json({ error: "Falta parámetro numero" });
            return;
        }
        const { rows } = await db_1.pool.query("SELECT * FROM resguardos WHERE numero_inventario = $1 ORDER BY fecha DESC", [numInv]);
        const userIds = [...new Set(rows.map((r) => r.id_usuario).filter(Boolean))];
        const userMap = new Map();
        if (userIds.length > 0) {
            const uRes = await db_1.pool.query(`SELECT id_usuario, nombre FROM usuarios WHERE id_usuario = ANY($1)`, [userIds]);
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
    }
    catch (err) {
        console.error("historia error:", err);
        res.status(500).json({ error: "Error al obtener historial" });
    }
});
// POST /api/activos
router.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const dto = req.body;
        const { rows } = await db_1.pool.query(`INSERT INTO activos
         (numero_inventario, descripcion, marca, modelo, numero_serie, clasificacion,
          id_cta_contable, costo, f_alta, f_factura, folio_factura, estatus, tipo, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,$12,$13)
       RETURNING *`, [
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
        ]);
        const newId = rows[0]?.id_consecutivo;
        if (newId) {
            await auditLog("activos", String(newId), "CREATE", null, null, dto.numeroInventario, req.user, req.ip);
        }
        res.status(201).json({ data: rows[0] });
    }
    catch (err) {
        console.error("createActivo error:", err);
        res.status(500).json({ error: "Error al crear activo" });
    }
});
// PATCH /api/activos/:id
router.patch("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const dto = req.body;
        // Capturar estado previo para auditoría
        const { rows: prevRows } = await db_1.pool.query("SELECT * FROM activos WHERE id_consecutivo = $1", [id]);
        const prev = prevRows[0];
        const setCols = [];
        const params = [];
        let i = 1;
        const estatusMap = { ACTIVO: 1, BAJA: 0, ALMACEN: 2, "PRE-BAJA": 3 };
        const estatusStrMap = { 1: "ACTIVO", 0: "BAJA", 2: "ALMACEN", 3: "PRE-BAJA" };
        if (dto.descripcion !== undefined) {
            setCols.push(`descripcion = $${i++}`);
            params.push(dto.descripcion);
        }
        if (dto.marca !== undefined) {
            setCols.push(`marca = $${i++}`);
            params.push(dto.marca);
        }
        if (dto.modelo !== undefined) {
            setCols.push(`modelo = $${i++}`);
            params.push(dto.modelo);
        }
        if (dto.numeroSerie !== undefined) {
            setCols.push(`numero_serie = $${i++}`);
            params.push(dto.numeroSerie);
        }
        if (dto.clasificacion !== undefined) {
            setCols.push(`clasificacion = $${i++}`);
            params.push(dto.clasificacion ? parseInt(dto.clasificacion) : null);
        }
        if (dto.idCuentaContable !== undefined) {
            setCols.push(`id_cta_contable = $${i++}`);
            params.push(dto.idCuentaContable ? parseInt(dto.idCuentaContable) : null);
        }
        if (dto.costo !== undefined) {
            setCols.push(`costo = $${i++}`);
            params.push(dto.costo);
        }
        if (dto.fechaFactura !== undefined) {
            setCols.push(`f_factura = $${i++}`);
            params.push(dto.fechaFactura || null);
        }
        if (dto.folioFactura !== undefined) {
            setCols.push(`folio_factura = $${i++}`);
            params.push(dto.folioFactura || null);
        }
        if (dto.observaciones !== undefined) {
            setCols.push(`observaciones = $${i++}`);
            params.push(dto.observaciones || null);
        }
        if (dto.estatus !== undefined) {
            setCols.push(`estatus = $${i++}`);
            params.push(estatusMap[dto.estatus] ?? 1);
        }
        if (setCols.length === 0) {
            res.status(400).json({ error: "Sin campos para actualizar" });
            return;
        }
        params.push(id);
        const { rows } = await db_1.pool.query(`UPDATE activos SET ${setCols.join(", ")} WHERE id_consecutivo = $${i} RETURNING *`, params);
        // Auditar campo por campo
        if (prev) {
            const fieldMap = [
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
            const logInserts = [];
            for (const [dtoKey, dbCol] of fieldMap) {
                if (dto[dtoKey] === undefined)
                    continue;
                const prevStr = toAuditStr(prev[dbCol]);
                const newStr = toAuditStr(dto[dtoKey]);
                if (prevStr !== newStr) {
                    logInserts.push(auditLog("activos", String(id), "UPDATE", dbCol, prevStr, newStr, req.user, req.ip));
                }
            }
            // Estatus por separado (conversión número ↔ string)
            if (dto.estatus !== undefined) {
                const prevStatStr = prev.estatus !== null ? (estatusStrMap[prev.estatus] ?? String(prev.estatus)) : null;
                if (prevStatStr !== dto.estatus) {
                    logInserts.push(auditLog("activos", String(id), "UPDATE", "estatus", prevStatStr, dto.estatus, req.user, req.ip));
                }
            }
            await Promise.all(logInserts);
        }
        res.json({ data: rows[0] });
    }
    catch (err) {
        console.error("updateActivo error:", err);
        res.status(500).json({ error: "Error al actualizar activo" });
    }
});
// DELETE /api/activos/:id — baja lógica
router.delete("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rows: prevRows } = await db_1.pool.query("SELECT numero_inventario FROM activos WHERE id_consecutivo = $1", [id]);
        const numInv = prevRows[0]?.numero_inventario || "";
        await db_1.pool.query("UPDATE activos SET estatus = 0 WHERE id_consecutivo = $1", [id]);
        await auditLog("activos", String(id), "DELETE", null, numInv, null, req.user, req.ip);
        res.json({ data: null });
    }
    catch (err) {
        console.error("deleteActivo error:", err);
        res.status(500).json({ error: "Error al dar de baja activo" });
    }
});
// POST /api/activos/pre-baja
router.post("/pre-baja", auth_1.requireAuth, async (req, res) => {
    try {
        const { ids } = req.body;
        await db_1.pool.query("UPDATE activos SET estatus = 3 WHERE id_consecutivo = ANY($1) AND estatus = 1", [ids.map(Number)]);
        const logInserts = ids.map((id) => auditLog("activos", String(id), "UPDATE", "estatus", "ACTIVO", "PRE-BAJA", req.user, req.ip));
        await Promise.all(logInserts);
        res.json({ data: null });
    }
    catch (err) {
        res.status(500).json({ error: "Error al marcar pre-baja" });
    }
});
// POST /api/activos/reactivar
router.post("/reactivar", auth_1.requireAuth, async (req, res) => {
    try {
        const { ids } = req.body;
        await db_1.pool.query("UPDATE activos SET estatus = 1 WHERE id_consecutivo = ANY($1) AND estatus = 3", [ids.map(Number)]);
        const logInserts = ids.map((id) => auditLog("activos", String(id), "UPDATE", "estatus", "PRE-BAJA", "ACTIVO", req.user, req.ip));
        await Promise.all(logInserts);
        res.json({ data: null });
    }
    catch (err) {
        res.status(500).json({ error: "Error al reactivar activos" });
    }
});
// POST /api/activos/baja-definitiva
router.post("/baja-definitiva", auth_1.requireAuth, async (req, res) => {
    try {
        const { ids } = req.body;
        await db_1.pool.query("UPDATE activos SET estatus = 0 WHERE id_consecutivo = ANY($1) AND estatus = 3", [ids.map(Number)]);
        const logInserts = ids.map((id) => auditLog("activos", String(id), "DELETE", "estatus", "PRE-BAJA", "BAJA", req.user, req.ip));
        await Promise.all(logInserts);
        res.json({ data: null });
    }
    catch (err) {
        res.status(500).json({ error: "Error en baja definitiva" });
    }
});
exports.default = router;
