"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Helper: fetches module permissions for a non-SuperAdmin user
async function fetchModulosPermitidos(userId) {
    const { rows } = await db_1.pool.query(`SELECT m.clave, um.puede_editar
       FROM usuario_modulos um
       JOIN modulos m ON m.id_modulo = um.id_modulo
      WHERE um.id_usuario = $1 AND um.puede_ver = TRUE
      ORDER BY m.grupo, m.orden`, [userId]);
    return rows.map((r) => ({ clave: r.clave, puedeEditar: r.puede_editar }));
}
// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { usuario, password } = req.body;
        if (!usuario || !password) {
            res.status(400).json({ error: "Usuario y contraseña son requeridos" });
            return;
        }
        const { rows } = await db_1.pool.query("SELECT * FROM usuarios WHERE LOWER(usuario) = LOWER($1) LIMIT 1", [usuario]);
        const user = rows[0];
        if (!user) {
            res.status(401).json({ error: "Usuario o contraseña incorrectos" });
            return;
        }
        let passwordValid = false;
        if (user.password_hash) {
            passwordValid = await bcryptjs_1.default.compare(password, user.password_hash);
        }
        else if (user.password) {
            // Contraseña en texto plano (legacy)
            passwordValid = user.password === password;
            if (passwordValid) {
                const hash = await bcryptjs_1.default.hash(password, 10);
                await db_1.pool.query("UPDATE usuarios SET password_hash = $1, password = NULL WHERE id_usuario = $2", [hash, user.id_usuario]);
            }
        }
        if (!passwordValid) {
            res.status(401).json({ error: "Usuario o contraseña incorrectos" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({
            sub: String(user.id_usuario),
            id: user.id_usuario,
            usuario: user.usuario,
            nombre: user.nombre,
            permisos: user.permisos,
        }, process.env.JWT_SECRET, { expiresIn: "7d" });
        // SuperAdmin (permisos === 1) bypasses module checks — send empty array
        const modulosPermitidos = user.permisos === 1 ? [] : await fetchModulosPermitidos(user.id_usuario);
        res.json({
            id: user.id_usuario,
            nombre: user.nombre,
            usuario: user.usuario,
            permisos: user.permisos ?? 1,
            modulosPermitidos,
            token,
        });
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});
// GET /api/auth/me
router.get("/me", auth_1.requireAuth, async (req, res) => {
    try {
        const { rows } = await db_1.pool.query("SELECT id_usuario, nombre, usuario, permisos FROM usuarios WHERE id_usuario = $1 LIMIT 1", [req.user.sub]);
        const user = rows[0];
        if (!user) {
            res.status(401).json({ error: "Usuario no encontrado" });
            return;
        }
        const modulosPermitidos = user.permisos === 1 ? [] : await fetchModulosPermitidos(user.id_usuario);
        res.json({
            id: user.id_usuario,
            nombre: user.nombre,
            usuario: user.usuario,
            permisos: user.permisos ?? 1,
            modulosPermitidos,
        });
    }
    catch (err) {
        console.error("Auth me error:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});
// POST /api/auth/change-password
router.post("/change-password", auth_1.requireAuth, async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;
        const userId = req.user.id;
        if (!passwordActual || !passwordNueva) {
            res.status(400).json({ error: "La contraseña actual y la nueva son requeridas" });
            return;
        }
        // Buscar al usuario
        const { rows } = await db_1.pool.query("SELECT * FROM usuarios WHERE id_usuario = $1 LIMIT 1", [userId]);
        const user = rows[0];
        if (!user) {
            res.status(404).json({ error: "Usuario no encontrado" });
            return;
        }
        // Verificar contraseña actual
        let passwordValid = false;
        if (user.password_hash) {
            passwordValid = await bcryptjs_1.default.compare(passwordActual, user.password_hash);
        }
        else if (user.password) {
            passwordValid = user.password === passwordActual;
        }
        if (!passwordValid) {
            res.status(401).json({ error: "La contraseña actual es incorrecta" });
            return;
        }
        // Guardar nueva contraseña
        const hash = await bcryptjs_1.default.hash(passwordNueva, 10);
        await db_1.pool.query("UPDATE usuarios SET password_hash = $1, password = NULL WHERE id_usuario = $2", [hash, userId]);
        // Registro en bitácora
        await db_1.pool.query(`INSERT INTO audit_logs
         (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo,
          id_usuario, usuario, nombre_usuario, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
            "usuarios",
            String(userId),
            "UPDATE",
            "password",
            "***",
            "***",
            req.user.id,
            req.user.usuario,
            req.user.nombre,
            req.ip || null,
        ]);
        res.json({ message: "Contraseña cambiada exitosamente" });
    }
    catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ error: "Error interno del servidor al cambiar contraseña" });
    }
});
exports.default = router;
