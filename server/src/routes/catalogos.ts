import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/catalogos/consignas
router.get("/consignas", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query("SELECT * FROM consignas ORDER BY id_consigna");
    res.json({ data: { items: rows.map((r) => ({ id: r.id_consigna, nombre: r.consigna })) } });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener consignas" });
  }
});

// GET /api/catalogos/clasificaciones
router.get("/clasificaciones", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM clasificacion WHERE estatus = 1 ORDER BY id_clasificacion"
    );
    res.json({
      data: {
        items: rows.map((r) => ({
          id: String(r.id_clasificacion),
          codigo: String(r.id_clasificacion),
          nombre: r.clasificacion || "",
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener clasificaciones" });
  }
});

// GET /api/catalogos/cuentas-contables
router.get("/cuentas-contables", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM ctas_contables WHERE estatus = 1 ORDER BY id_ctacontable"
    );
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
  } catch (err) {
    res.status(500).json({ error: "Error al obtener cuentas contables" });
  }
});

export default router;
