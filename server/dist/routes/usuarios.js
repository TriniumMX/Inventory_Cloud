"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
async function auditLog(tabla, registroId, accion, campo, valorAnterior, valorNuevo, user, ip) {
    await db_1.pool.query(`INSERT INTO audit_logs
       (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo,
        id_usuario, usuario, nombre_usuario, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [tabla, registroId, accion, campo, valorAnterior, valorNuevo,
        user.id, user.usuario, user.nombre, ip || null]);
}
// GET /api/usuarios
router.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const { q, search, page = "1", pageSize = "50" } = req.query;
        const term = q || search || "";
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;
        let sql = "SELECT id_usuario, nombre, usuario, permisos FROM usuarios";
        const params = [];
        let i = 1;
        if (term) {
            sql += ` WHERE nombre ILIKE $${i} OR usuario ILIKE $${i}`;
            params.push(`%${term}%`);
            i++;
        }
        const countSql = `SELECT COUNT(*) FROM (${sql}) AS t`;
        const countRes = await db_1.pool.query(countSql, params);
        const total = parseInt(countRes.rows[0].count);
        sql += ` ORDER BY id_usuario LIMIT $${i} OFFSET $${i + 1}`;
        params.push(pageSizeNum, offset);
        const { rows } = await db_1.pool.query(sql, params);
        const items = rows.map((r) => ({
            id: r.id_usuario,
            nombre: r.nombre || "",
            usuario: r.usuario || "",
            permisos: r.permisos || 1,
        }));
        res.json({ data: { items, total } });
    }
    catch (err) {
        console.error("listUsuarios error:", err);
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
});
// POST /api/usuarios
router.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const { nombre, usuario, password, permisos } = req.body;
        // Verificar que el usuario no exista
        const { rows: existing } = await db_1.pool.query("SELECT id_usuario FROM usuarios WHERE LOWER(usuario) = LOWER($1) LIMIT 1", [usuario]);
        if (existing.length > 0) {
            res.status(409).json({ error: "El nombre de usuario ya existe" });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const { rows } = await db_1.pool.query("INSERT INTO usuarios (nombre, usuario, password_hash, permisos) VALUES ($1,$2,$3,$4) RETURNING id_usuario, nombre, usuario, permisos", [nombre, usuario, passwordHash, permisos]);
        const u = rows[0];
        await auditLog("usuarios", String(u.id_usuario), "CREATE", null, null, usuario, req.user, req.ip);
        res.status(201).json({ data: { id: u.id_usuario, nombre: u.nombre, usuario: u.usuario, permisos: u.permisos } });
    }
    catch (err) {
        console.error("createUsuario error:", err);
        res.status(500).json({ error: "Error al crear usuario" });
    }
});
// PATCH /api/usuarios/:id
router.patch("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const dto = req.body;
        // Capturar estado previo
        const { rows: prevRows } = await db_1.pool.query("SELECT nombre, usuario, permisos FROM usuarios WHERE id_usuario = $1", [id]);
        const prev = prevRows[0];
        // Verificar nombre de usuario duplicado si se está cambiando
        if (dto.usuario) {
            const { rows: existing } = await db_1.pool.query("SELECT id_usuario FROM usuarios WHERE LOWER(usuario) = LOWER($1) AND id_usuario != $2 LIMIT 1", [dto.usuario, id]);
            if (existing.length > 0) {
                res.status(409).json({ error: "El nombre de usuario ya existe" });
                return;
            }
        }
        const setCols = [];
        const params = [];
        let i = 1;
        if (dto.nombre !== undefined) {
            setCols.push(`nombre = $${i++}`);
            params.push(dto.nombre);
        }
        if (dto.usuario !== undefined) {
            setCols.push(`usuario = $${i++}`);
            params.push(dto.usuario);
        }
        if (dto.permisos !== undefined) {
            setCols.push(`permisos = $${i++}`);
            params.push(dto.permisos);
        }
        if (dto.password) {
            const hash = await bcryptjs_1.default.hash(dto.password, 10);
            setCols.push(`password_hash = $${i++}`);
            params.push(hash);
            setCols.push(`password = NULL`);
        }
        if (setCols.length === 0) {
            res.status(400).json({ error: "Sin campos para actualizar" });
            return;
        }
        params.push(id);
        const { rows } = await db_1.pool.query(`UPDATE usuarios SET ${setCols.join(", ")} WHERE id_usuario = $${i} RETURNING id_usuario, nombre, usuario, permisos`, params);
        // Auditoría por campo
        if (prev) {
            const logInserts = [];
            const auditFields = [
                ["nombre", "nombre"],
                ["usuario", "usuario"],
                ["permisos", "permisos"],
            ];
            for (const [dtoKey, dbCol] of auditFields) {
                if (dto[dtoKey] === undefined)
                    continue;
                const prevStr = prev[dbCol] !== null ? String(prev[dbCol]) : null;
                const newStr = dto[dtoKey] !== null ? String(dto[dtoKey]) : null;
                if (prevStr !== newStr) {
                    logInserts.push(auditLog("usuarios", String(id), "UPDATE", dbCol, prevStr, newStr, req.user, req.ip));
                }
            }
            if (dto.password) {
                logInserts.push(auditLog("usuarios", String(id), "UPDATE", "password", "***", "***", req.user, req.ip));
            }
            await Promise.all(logInserts);
        }
        const u = rows[0];
        res.json({ data: { id: u.id_usuario, nombre: u.nombre, usuario: u.usuario, permisos: u.permisos } });
    }
    catch (err) {
        console.error("updateUsuario error:", err);
        res.status(500).json({ error: "Error al actualizar usuario" });
    }
});
// DELETE /api/usuarios/:id
router.delete("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rows: prevRows } = await db_1.pool.query("SELECT usuario FROM usuarios WHERE id_usuario = $1", [id]);
        const usuarioNombre = prevRows[0]?.usuario || "";
        await db_1.pool.query("DELETE FROM usuarios WHERE id_usuario = $1", [id]);
        await auditLog("usuarios", String(id), "DELETE", null, usuarioNombre, null, req.user, req.ip);
        res.json({ data: null });
    }
    catch (err) {
        console.error("deleteUsuario error:", err);
        res.status(500).json({ error: "Error al eliminar usuario" });
    }
});
exports.default = router;
