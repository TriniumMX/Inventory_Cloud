import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { emitChange } from "../realtime";

const router = Router();

async function auditLog(
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
     VALUES ('consignas',$1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [registroId, accion, campo, valorAnterior, valorNuevo, user.id, user.usuario, user.nombre, ip || null]
  );
}

// GET /api/consignas?q=XX
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query as Record<string, string>;
    const params: unknown[] = [];
    let sql = "SELECT id_consigna, consigna, estatus FROM consignas";
    if (q) { sql += " WHERE consigna ILIKE $1"; params.push(`%${q}%`); }
    sql += " ORDER BY consigna";
    const { rows } = await pool.query(sql, params);
    const items = rows.map((r) => ({ id: r.id_consigna, nombre: r.consigna || "", estatus: r.estatus === 1 ? 1 : 0 }));
    res.json({ data: { items, total: items.length } });
  } catch (err) {
    console.error("listInstituciones error:", err);
    res.status(500).json({ error: "Error al obtener instituciones" });
  }
});

// POST /api/consignas
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, estatus } = req.body as { nombre: string; estatus: 1 | 0 };

    const { rows: existing } = await pool.query(
      "SELECT id_consigna FROM consignas WHERE consigna ILIKE $1 LIMIT 1", [nombre]
    );
    if (existing.length > 0) { res.status(409).json({ error: "Ya existe una institución con ese nombre" }); return; }

    const { rows } = await pool.query(
      "INSERT INTO consignas (consigna, estatus) VALUES ($1,$2) RETURNING id_consigna, consigna, estatus",
      [nombre, estatus]
    );
    const c = rows[0];
    await auditLog(String(c.id_consigna), "CREATE", null, null, nombre, req.user!, req.ip);

    emitChange("consignas", "create", c.id_consigna);
    res.status(201).json({ data: { id: c.id_consigna, nombre: c.consigna, estatus: c.estatus === 1 ? 1 : 0 } });
  } catch (err) {
    console.error("createInstitucion error:", err);
    res.status(500).json({ error: "Error al crear institución" });
  }
});

// PATCH /api/consignas/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { nombre, estatus } = req.body as { nombre?: string; estatus?: 1 | 0 };

    const { rows: prevRows } = await pool.query(
      "SELECT consigna, estatus FROM consignas WHERE id_consigna = $1", [id]
    );
    if (!prevRows[0]) { res.status(404).json({ error: "Institución no encontrada" }); return; }
    const prev = prevRows[0];

    if (nombre !== undefined) {
      const { rows: existing } = await pool.query(
        "SELECT id_consigna FROM consignas WHERE consigna ILIKE $1 AND id_consigna != $2 LIMIT 1",
        [nombre, id]
      );
      if (existing.length > 0) { res.status(409).json({ error: "Ya existe una institución con ese nombre" }); return; }
    }

    const setCols: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (nombre !== undefined) { setCols.push(`consigna = $${i++}`); params.push(nombre); }
    if (estatus !== undefined) { setCols.push(`estatus = $${i++}`); params.push(estatus); }
    if (setCols.length === 0) { res.status(400).json({ error: "Sin campos para actualizar" }); return; }

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE consignas SET ${setCols.join(", ")} WHERE id_consigna = $${i} RETURNING id_consigna, consigna, estatus`,
      params
    );

    if (nombre !== undefined && prev.consigna !== nombre) {
      await auditLog(String(id), "UPDATE", "consigna", prev.consigna, nombre, req.user!, req.ip);
    }
    if (estatus !== undefined && prev.estatus !== estatus) {
      await auditLog(String(id), "UPDATE", "estatus", String(prev.estatus), String(estatus), req.user!, req.ip);
    }

    const c = rows[0];
    emitChange("consignas", "update", id);
    res.json({ data: { id: c.id_consigna, nombre: c.consigna, estatus: c.estatus === 1 ? 1 : 0 } });
  } catch (err) {
    console.error("updateInstitucion error:", err);
    res.status(500).json({ error: "Error al actualizar institución" });
  }
});

// DELETE /api/consignas/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { rows: prevRows } = await pool.query("SELECT consigna FROM consignas WHERE id_consigna = $1", [id]);
    await pool.query("DELETE FROM consignas WHERE id_consigna = $1", [id]);
    await auditLog(String(id), "DELETE", null, prevRows[0]?.consigna || "", null, req.user!, req.ip);
    emitChange("consignas", "delete", id);
    res.json({ data: null });
  } catch (err) {
    console.error("deleteInstitucion error:", err);
    res.status(500).json({ error: "Error al eliminar institución" });
  }
});

export default router;
