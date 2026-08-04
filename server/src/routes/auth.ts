import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Helper: fetches module permissions for a non-SuperAdmin user
async function fetchModulosPermitidos(
  userId: number
): Promise<{ clave: string; puedeEditar: boolean }[]> {
  const { rows } = await pool.query(
    `SELECT m.clave, um.puede_editar
       FROM usuario_modulos um
       JOIN modulos m ON m.id_modulo = um.id_modulo
      WHERE um.id_usuario = $1 AND um.puede_ver = TRUE
      ORDER BY m.grupo, m.orden`,
    [userId]
  );
  return rows.map((r) => ({ clave: r.clave, puedeEditar: r.puede_editar }));
}

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      res.status(400).json({ error: "Usuario y contraseña son requeridos" });
      return;
    }

    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE LOWER(usuario) = LOWER($1) LIMIT 1",
      [usuario]
    );

    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      return;
    }

    let passwordValid = false;

    if (user.password_hash) {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } else if (user.password) {
      // Contraseña en texto plano (legacy)
      passwordValid = user.password === password;
      if (passwordValid) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
          "UPDATE usuarios SET password_hash = $1, password = NULL WHERE id_usuario = $2",
          [hash, user.id_usuario]
        );
      }
    }

    if (!passwordValid) {
      res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      return;
    }

    const token = jwt.sign(
      {
        sub: String(user.id_usuario),
        id: user.id_usuario,
        usuario: user.usuario,
        nombre: user.nombre,
        permisos: user.permisos,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // SuperAdmin (permisos === 1) bypasses module checks — send empty array
    const modulosPermitidos =
      user.permisos === 1 ? [] : await fetchModulosPermitidos(user.id_usuario);

    res.json({
      id: user.id_usuario,
      nombre: user.nombre,
      usuario: user.usuario,
      permisos: user.permisos ?? 1,
      modulosPermitidos,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT id_usuario, nombre, usuario, permisos FROM usuarios WHERE id_usuario = $1 LIMIT 1",
      [req.user!.sub]
    );

    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: "Usuario no encontrado" });
      return;
    }

    const modulosPermitidos =
      user.permisos === 1 ? [] : await fetchModulosPermitidos(user.id_usuario);

    res.json({
      id: user.id_usuario,
      nombre: user.nombre,
      usuario: user.usuario,
      permisos: user.permisos ?? 1,
      modulosPermitidos,
    });
  } catch (err) {
    console.error("Auth me error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    const userId = req.user!.id;

    if (!passwordActual || !passwordNueva) {
      res.status(400).json({ error: "La contraseña actual y la nueva son requeridas" });
      return;
    }

    // Buscar al usuario
    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE id_usuario = $1 LIMIT 1",
      [userId]
    );

    const user = rows[0];
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    // Verificar contraseña actual
    let passwordValid = false;
    if (user.password_hash) {
      passwordValid = await bcrypt.compare(passwordActual, user.password_hash);
    } else if (user.password) {
      passwordValid = user.password === passwordActual;
    }

    if (!passwordValid) {
      res.status(401).json({ error: "La contraseña actual es incorrecta" });
      return;
    }

    // Guardar nueva contraseña
    const hash = await bcrypt.hash(passwordNueva, 10);
    await pool.query(
      "UPDATE usuarios SET password_hash = $1, password = NULL WHERE id_usuario = $2",
      [hash, userId]
    );

    // Registro en bitácora
    await pool.query(
      `INSERT INTO audit_logs
         (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo,
          id_usuario, usuario, nombre_usuario, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        "usuarios",
        String(userId),
        "UPDATE",
        "password",
        "***",
        "***",
        req.user!.id,
        req.user!.usuario,
        req.user!.nombre,
        req.ip || null,
      ]
    );

    res.json({ message: "Contraseña cambiada exitosamente" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Error interno del servidor al cambiar contraseña" });
  }
});

export default router;
