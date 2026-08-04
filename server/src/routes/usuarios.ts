import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

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

// GET /api/usuarios
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, search, page = "1", pageSize = "50" } = req.query as Record<string, string>;
    const term = q || search || "";
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const offset = (pageNum - 1) * pageSizeNum;

    let sql = "SELECT id_usuario, nombre, usuario, permisos FROM usuarios";
    const params: unknown[] = [];
    let i = 1;

    if (term) {
      sql += ` WHERE nombre ILIKE $${i} OR usuario ILIKE $${i}`;
      params.push(`%${term}%`);
      i++;
    }

    const countSql = `SELECT COUNT(*) FROM (${sql}) AS t`;
    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0].count);

    sql += ` ORDER BY id_usuario LIMIT $${i} OFFSET $${i + 1}`;
    params.push(pageSizeNum, offset);

    const { rows } = await pool.query(sql, params);
    const items = rows.map((r) => ({
      id: r.id_usuario,
      nombre: r.nombre || "",
      usuario: r.usuario || "",
      permisos: r.permisos || 1,
    }));

    res.json({ data: { items, total } });
  } catch (err) {
    console.error("listUsuarios error:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// POST /api/usuarios
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, usuario, password, permisos } = req.body;

    // Verificar que el usuario no exista
    const { rows: existing } = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE LOWER(usuario) = LOWER($1) LIMIT 1",
      [usuario]
    );
    if (existing.length > 0) {
      res.status(409).json({ error: "El nombre de usuario ya existe" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO usuarios (nombre, usuario, password_hash, permisos) VALUES ($1,$2,$3,$4) RETURNING id_usuario, nombre, usuario, permisos",
      [nombre, usuario, passwordHash, permisos]
    );

    const u = rows[0];
    await auditLog("usuarios", String(u.id_usuario), "CREATE", null, null, usuario, req.user!, req.ip);

    res.status(201).json({ data: { id: u.id_usuario, nombre: u.nombre, usuario: u.usuario, permisos: u.permisos } });
  } catch (err) {
    console.error("createUsuario error:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// PATCH /api/usuarios/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const dto = req.body;

    // Capturar estado previo
    const { rows: prevRows } = await pool.query(
      "SELECT nombre, usuario, permisos FROM usuarios WHERE id_usuario = $1", [id]
    );
    const prev = prevRows[0];

    // Verificar nombre de usuario duplicado si se está cambiando
    if (dto.usuario) {
      const { rows: existing } = await pool.query(
        "SELECT id_usuario FROM usuarios WHERE LOWER(usuario) = LOWER($1) AND id_usuario != $2 LIMIT 1",
        [dto.usuario, id]
      );
      if (existing.length > 0) {
        res.status(409).json({ error: "El nombre de usuario ya existe" });
        return;
      }
    }

    const setCols: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (dto.nombre !== undefined) { setCols.push(`nombre = $${i++}`); params.push(dto.nombre); }
    if (dto.usuario !== undefined) { setCols.push(`usuario = $${i++}`); params.push(dto.usuario); }
    if (dto.permisos !== undefined) { setCols.push(`permisos = $${i++}`); params.push(dto.permisos); }
    if (dto.password) {
      const hash = await bcrypt.hash(dto.password, 10);
      setCols.push(`password_hash = $${i++}`); params.push(hash);
      setCols.push(`password = NULL`);
    }

    if (setCols.length === 0) { res.status(400).json({ error: "Sin campos para actualizar" }); return; }

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE usuarios SET ${setCols.join(", ")} WHERE id_usuario = $${i} RETURNING id_usuario, nombre, usuario, permisos`,
      params
    );

    // Auditoría por campo
    if (prev) {
      const logInserts: Promise<void>[] = [];
      const auditFields: Array<[string, string]> = [
        ["nombre", "nombre"],
        ["usuario", "usuario"],
        ["permisos", "permisos"],
      ];
      for (const [dtoKey, dbCol] of auditFields) {
        if (dto[dtoKey] === undefined) continue;
        const prevStr = prev[dbCol] !== null ? String(prev[dbCol]) : null;
        const newStr = dto[dtoKey] !== null ? String(dto[dtoKey]) : null;
        if (prevStr !== newStr) {
          logInserts.push(auditLog("usuarios", String(id), "UPDATE", dbCol, prevStr, newStr, req.user!, req.ip));
        }
      }
      if (dto.password) {
        logInserts.push(auditLog("usuarios", String(id), "UPDATE", "password", "***", "***", req.user!, req.ip));
      }
      await Promise.all(logInserts);
    }

    const u = rows[0];
    res.json({ data: { id: u.id_usuario, nombre: u.nombre, usuario: u.usuario, permisos: u.permisos } });
  } catch (err) {
    console.error("updateUsuario error:", err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// DELETE /api/usuarios/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { rows: prevRows } = await pool.query(
      "SELECT usuario FROM usuarios WHERE id_usuario = $1", [id]
    );
    const usuarioNombre = prevRows[0]?.usuario || "";

    await pool.query("DELETE FROM usuarios WHERE id_usuario = $1", [id]);

    await auditLog("usuarios", String(id), "DELETE", null, usuarioNombre, null, req.user!, req.ip);

    res.json({ data: null });
  } catch (err) {
    console.error("deleteUsuario error:", err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;
