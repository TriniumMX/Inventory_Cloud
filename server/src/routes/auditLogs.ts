import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/audit-logs — lista con filtros avanzados + paginación
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tabla,
      registroId,
      accion,
      usuario,
      fechaDesde,
      fechaHasta,
      limit = "50",
      offset = "0",
    } = req.query as Record<string, string>;

    const params: unknown[] = [];
    const conditions: string[] = [];
    let i = 1;

    if (tabla && tabla !== "todos") { conditions.push(`al.tabla = $${i++}`); params.push(tabla); }
    if (registroId) { conditions.push(`al.registro_id = $${i++}`); params.push(registroId); }
    if (accion && accion !== "TODOS") { conditions.push(`al.accion = $${i++}`); params.push(accion); }
    if (usuario) {
      conditions.push(`(al.usuario ILIKE $${i} OR al.nombre_usuario ILIKE $${i})`);
      params.push(`%${usuario}%`);
      i++;
    }
    if (fechaDesde) { conditions.push(`al.created_at >= $${i++}`); params.push(fechaDesde); }
    if (fechaHasta) { conditions.push(`al.created_at <= $${i++}`); params.push(fechaHasta + "T23:59:59Z"); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_logs al ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const { rows } = await pool.query(
      `SELECT al.id, al.tabla, al.registro_id, al.accion, al.campo,
              al.valor_anterior, al.valor_nuevo,
              al.id_usuario, al.usuario, al.nombre_usuario, al.ip_address, al.created_at,
              CASE
                WHEN al.tabla = 'activos' THEN
                  (SELECT CONCAT(a.numero_inventario, ' – ', a.descripcion)
                   FROM activos a WHERE a.id_consecutivo::text = al.registro_id LIMIT 1)
                WHEN al.tabla = 'bienes_inmuebles' THEN
                  (SELECT CONCAT(bi.numero_inventario, ' – ', bi.descripcion)
                   FROM bienes_inmuebles bi
                   WHERE bi.id::text = al.registro_id LIMIT 1)
                WHEN al.tabla = 'usuarios' THEN
                  (SELECT u.nombre FROM usuarios u
                   WHERE u.id_usuario::text = al.registro_id LIMIT 1)
                ELSE NULL
              END AS descripcion_registro
       FROM audit_logs al
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      params
    );

    res.json({ data: { items: rows, total } });
  } catch (err) {
    console.error("auditLogs GET error:", err);
    res.status(500).json({ error: "Error al obtener logs" });
  }
});

// POST /api/audit-logs — para eventos del cliente (exportar reportes, imprimir etiquetas, etc.)
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tabla, registroId, accion, campo, valorAnterior, valorNuevo } = req.body;
    await pool.query(
      `INSERT INTO audit_logs
         (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo,
          id_usuario, usuario, nombre_usuario, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        tabla || "sistema",
        registroId || "-",
        accion || "EVENTO",
        campo || null,
        valorAnterior || null,
        valorNuevo || null,
        req.user!.id,
        req.user!.usuario,
        req.user!.nombre,
        req.ip || null,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("auditLogs POST error:", err);
    res.status(500).json({ error: "Error al registrar evento" });
  }
});

export default router;
