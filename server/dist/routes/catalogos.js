"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/catalogos/consignas
router.get("/consignas", auth_1.requireAuth, async (_req, res) => {
    try {
        const { rows } = await db_1.pool.query("SELECT * FROM consignas ORDER BY id_consigna");
        res.json({ data: { items: rows.map((r) => ({ id: r.id_consigna, nombre: r.consigna })) } });
    }
    catch (err) {
        res.status(500).json({ error: "Error al obtener consignas" });
    }
});
// GET /api/catalogos/clasificaciones
router.get("/clasificaciones", auth_1.requireAuth, async (_req, res) => {
    try {
        const { rows } = await db_1.pool.query("SELECT * FROM clasificacion WHERE estatus = 1 ORDER BY id_clasificacion");
        res.json({
            data: {
                items: rows.map((r) => ({
                    id: String(r.id_clasificacion),
                    codigo: String(r.id_clasificacion),
                    nombre: r.clasificacion || "",
                })),
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: "Error al obtener clasificaciones" });
    }
});
// GET /api/catalogos/cuentas-contables
router.get("/cuentas-contables", auth_1.requireAuth, async (_req, res) => {
    try {
        const { rows } = await db_1.pool.query("SELECT * FROM ctas_contables WHERE estatus = 1 ORDER BY id_ctacontable");
        res.json({
            data: {
                items: rows.map((r) => ({
                    id: String(r.id_ctacontable),
                    cta_contable: r.cta_contable || "",
                    ctaContable: r.cta_contable || "",
                    descripcion: r.descripcion || "",
                    clasificacion: r.id_clasificacion_cta,
                })),
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: "Error al obtener cuentas contables" });
    }
});
exports.default = router;
