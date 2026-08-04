import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [muebles, enseres, inmuebles, resguardos, costos] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM activos WHERE tipo = 1 AND estatus != 0"),
      pool.query("SELECT COUNT(*) FROM activos WHERE tipo = 2 AND estatus != 0"),
      pool.query("SELECT COUNT(*) FROM bienes_inmuebles WHERE estatus != 0"),
      pool.query(`
        SELECT
          COUNT(*)                             AS total,
          COUNT(*) FILTER (WHERE tipo = 1)     AS muebles,
          COUNT(*) FILTER (WHERE tipo = 2)     AS enseres
        FROM activos
        WHERE estatus != 0
          AND tipo IN (1, 2)
          AND ultimo_nomina IS NOT NULL
          AND TRIM(ultimo_nomina) != ''
      `),
      pool.query("SELECT tipo, COALESCE(SUM(costo), 0) AS total FROM activos WHERE estatus != 0 AND tipo IN (1,2) GROUP BY tipo"),
    ]);

    const costoMap: Record<number, number> = {};
    for (const row of costos.rows) {
      costoMap[row.tipo] = parseFloat(row.total);
    }

    res.json({
      data: {
        bienesMuebles: parseInt(muebles.rows[0].count),
        enseres: parseInt(enseres.rows[0].count),
        bienesInmuebles: parseInt(inmuebles.rows[0].count),
        resguardosActivos: parseInt(resguardos.rows[0].total),
        resguardosMuebles: parseInt(resguardos.rows[0].muebles),
        resguardosEnseres: parseInt(resguardos.rows[0].enseres),
        valorMuebles: costoMap[1] || 0,
        valorEnseres: costoMap[2] || 0,
      },
    });
  } catch (err) {
    console.error("dashboard stats error:", err);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// GET /api/dashboard/actividad
router.get("/actividad", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [resguardosRes, activosRes] = await Promise.all([
      pool.query(
        "SELECT folio, nomina, fecha, numero_inventario FROM resguardos WHERE estatus = true ORDER BY fecha DESC LIMIT 10"
      ),
      pool.query(
        "SELECT numero_inventario, descripcion, f_alta FROM activos WHERE estatus != 0 ORDER BY id_consecutivo DESC LIMIT 3"
      ),
    ]);

    const actividades: { tipo: string; descripcion: string; fecha: string; detalle?: string }[] = [];
    const foliosVistos = new Set<string>();

    for (const r of resguardosRes.rows) {
      if (r.folio && !foliosVistos.has(r.folio)) {
        foliosVistos.add(r.folio);
        actividades.push({
          tipo: "resguardo",
          descripcion: `Resguardo asignado a nómina ${r.nomina || "N/A"}`,
          fecha: r.fecha || "",
          detalle: r.numero_inventario || undefined,
        });
      }
      if (foliosVistos.size >= 3) break;
    }

    for (const a of activosRes.rows) {
      const desc = a.descripcion || "Sin descripción";
      actividades.push({
        tipo: "activo",
        descripcion: `Nuevo activo: ${desc.substring(0, 40)}${desc.length > 40 ? "..." : ""}`,
        fecha: a.f_alta || "",
        detalle: a.numero_inventario || undefined,
      });
    }

    actividades.sort((a, b) => {
      const da = a.fecha ? new Date(a.fecha).getTime() : 0;
      const db = b.fecha ? new Date(b.fecha).getTime() : 0;
      return db - da;
    });

    res.json({ data: actividades.slice(0, 5) });
  } catch (err) {
    console.error("dashboard actividad error:", err);
    res.status(500).json({ error: "Error al obtener actividad reciente" });
  }
});

export default router;
