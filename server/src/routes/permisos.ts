import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Helper: only SuperAdmin can manage permissions
function isSuperAdmin(req: Request, res: Response): boolean {
  if (req.user!.permisos !== 1) {
    res.status(403).json({ error: "Solo SuperAdmin puede gestionar permisos" });
    return false;
  }
  return true;
}

// GET /api/permisos/modulos — catálogo completo de módulos
router.get("/modulos", requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!isSuperAdmin(req, res)) return;
  try {
    const { rows } = await pool.query(
      "SELECT id_modulo, clave, nombre, grupo, orden FROM modulos ORDER BY grupo, orden"
    );
    res.json({ data: rows });
  } catch (err) {
    console.error("[permisos/modulos] Error:", err);
    res.status(500).json({ error: "Error al obtener módulos" });
  }
});

// GET /api/permisos/usuario/:id — módulos asignados al usuario (todos con sus flags)
router.get("/usuario/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!isSuperAdmin(req, res)) return;
  try {
    const userId = parseInt(req.params.id, 10);
    const { rows } = await pool.query(
      `SELECT m.clave,
              COALESCE(um.puede_ver,    FALSE) AS puede_ver,
              COALESCE(um.puede_editar, FALSE) AS puede_editar
         FROM modulos m
         LEFT JOIN usuario_modulos um
           ON um.id_modulo = m.id_modulo AND um.id_usuario = $1
        ORDER BY m.grupo, m.orden`,
      [userId]
    );
    const data = rows.map((r) => ({
      clave:       r.clave,
      puedeVer:    r.puede_ver,
      puedeEditar: r.puede_editar,
    }));
    res.json({ data });
  } catch (err) {
    console.error("[permisos/usuario GET] Error:", err);
    res.status(500).json({ error: "Error al obtener permisos del usuario" });
  }
});

// PUT /api/permisos/usuario/:id — reemplaza TODAS las asignaciones del usuario
router.put("/usuario/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!isSuperAdmin(req, res)) return;
  const userId = parseInt(req.params.id, 10);
  const { modulos } = req.body as {
    modulos: { clave: string; puedeVer: boolean; puedeEditar: boolean }[];
  };

  if (!Array.isArray(modulos)) {
    res.status(400).json({ error: "Se esperaba un array de módulos" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Eliminar todas las asignaciones actuales
    await client.query("DELETE FROM usuario_modulos WHERE id_usuario = $1", [userId]);

    // Insertar solo los módulos donde al menos puede_ver es TRUE
    for (const m of modulos) {
      if (!m.puedeVer && !m.puedeEditar) continue;
      const { rows } = await client.query(
        "SELECT id_modulo FROM modulos WHERE clave = $1",
        [m.clave]
      );
      if (rows.length === 0) continue;
      await client.query(
        `INSERT INTO usuario_modulos (id_usuario, id_modulo, puede_ver, puede_editar)
         VALUES ($1, $2, $3, $4)`,
        [userId, rows[0].id_modulo, m.puedeVer, m.puedeEditar ?? false]
      );
    }

    await client.query("COMMIT");
    res.json({ data: null });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[permisos/usuario PUT] Error:", err);
    res.status(500).json({ error: "Error al actualizar permisos" });
  } finally {
    client.release();
  }
});

export default router;
