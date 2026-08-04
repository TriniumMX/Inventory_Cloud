"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireModulo = requireModulo;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ error: "No autorizado" });
        return;
    }
    const token = header.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        res.status(401).json({ error: "Token inválido o expirado" });
    }
}
// Factory que genera middleware de protección por módulo.
// SuperAdmin (permisos === 1) siempre pasa; los demás se consultan en usuario_modulos.
function requireModulo(clave, needsEdit = false) {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: "No autorizado" });
            return;
        }
        // SuperAdmin bypasses all module checks
        if (req.user.permisos === 1) {
            next();
            return;
        }
        try {
            const { rows } = await db_1.pool.query(`SELECT um.puede_ver, um.puede_editar
           FROM usuario_modulos um
           JOIN modulos m ON m.id_modulo = um.id_modulo
          WHERE um.id_usuario = $1 AND m.clave = $2`, [req.user.id, clave]);
            if (rows.length === 0 || !rows[0].puede_ver) {
                res.status(403).json({ error: "Sin acceso al módulo" });
                return;
            }
            if (needsEdit && !rows[0].puede_editar) {
                res.status(403).json({ error: "Sin permiso de edición en el módulo" });
                return;
            }
            next();
        }
        catch (err) {
            console.error("[requireModulo] Error:", err);
            res.status(500).json({ error: "Error verificando permisos" });
        }
    };
}
