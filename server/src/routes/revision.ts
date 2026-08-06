import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth, requireModulo } from "../middleware/auth";
import { emitChange } from "../realtime";

const router = Router();

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

// GET /api/revision?userId=X
router.get("/", requireAuth, requireModulo("revisiones", false), async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query as Record<string, string>;
    const params: unknown[] = ["activa"];
    let sql = "SELECT * FROM revision_sesiones WHERE estatus = $1";

    if (userId) {
      sql += " AND id_usuario = $2";
      params.push(parseInt(userId));
    }

    sql += " ORDER BY updated_at DESC LIMIT 5";
    const { rows } = await pool.query(sql, params);

    const items = rows.map((row) => ({
      id: row.id,
      mode: "responsable" as const,
      target: {
        responsableId: row.responsable_id ?? undefined,
        responsableNombre: row.responsable_nombre ?? undefined,
        responsableTipo: row.responsable_tipo ?? undefined,
      },
      expected: row.expected ?? [],
      scans: row.scans ?? [],
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
    }));

    res.json({ data: items });
  } catch (err) {
    console.error("getRevisionSesiones error:", err);
    res.status(500).json({ error: "Error al obtener sesiones" });
  }
});

// PUT /api/revision/:id — upsert
router.put("/:id", requireAuth, requireModulo("revisiones", true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { id_usuario, mode, responsable_id, responsable_nombre, responsable_tipo, expected, scans, notes, estatus } = req.body;

    // Verificar si ya existe para saber si es CREATE o UPDATE
    const { rows: existing } = await pool.query(
      "SELECT id, estatus FROM revision_sesiones WHERE id = $1", [id]
    );
    const isNew = existing.length === 0;

    await pool.query(
      `INSERT INTO revision_sesiones
         (id, id_usuario, mode, responsable_id, responsable_nombre, responsable_tipo, expected, scans, notes, estatus)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         id_usuario = EXCLUDED.id_usuario,
         mode = EXCLUDED.mode,
         responsable_id = EXCLUDED.responsable_id,
         responsable_nombre = EXCLUDED.responsable_nombre,
         responsable_tipo = EXCLUDED.responsable_tipo,
         expected = EXCLUDED.expected,
         scans = EXCLUDED.scans,
         notes = EXCLUDED.notes,
         estatus = EXCLUDED.estatus`,
      [id, id_usuario, mode ?? "responsable", responsable_id ?? "", responsable_nombre ?? "", responsable_tipo ?? "", JSON.stringify(expected ?? []), JSON.stringify(scans ?? []), notes ?? null, estatus ?? "activa"]
    );

    if (isNew) {
      await auditLog(
        "revisiones", id, "CREATE", null,
        null,
        responsable_nombre ?? null,
        req.user!, req.ip
      );
    }

    emitChange("revision", isNew ? "create" : "update", id);
    res.json({ data: null });
  } catch (err) {
    console.error("upsert revision error:", err);
    res.status(500).json({ error: "Error al guardar sesión" });
  }
});

// PATCH /api/revision/:id/finalizar
router.patch("/:id/finalizar", requireAuth, requireModulo("revisiones", true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await pool.query(
      "UPDATE revision_sesiones SET estatus = 'finalizada' WHERE id = $1",
      [id]
    );

    await auditLog(
      "revisiones", id, "FINALIZAR", null,
      null, null,
      req.user!, req.ip
    );

    emitChange("revision", "update", id);
    res.json({ data: null });
  } catch (err) {
    console.error("finalizar revision error:", err);
    res.status(500).json({ error: "Error al finalizar sesión" });
  }
});

// GET /api/revision/activos-info?nums=A,B,C — info extra para SessionBoard y SessionSummary
router.get("/activos-info", requireAuth, requireModulo("revisiones", false), async (req: Request, res: Response): Promise<void> => {
  try {
    const { nums } = req.query as Record<string, string>;
    if (!nums) { res.json({ data: [] }); return; }

    const numeros = nums.split(",").map((n) => n.trim()).filter(Boolean);
    const { rows } = await pool.query(
      "SELECT numero_inventario, descripcion, marca, modelo, numero_serie, ultimo_nomina FROM activos WHERE numero_inventario = ANY($1)",
      [numeros]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener info de activos" });
  }
});

export default router;
