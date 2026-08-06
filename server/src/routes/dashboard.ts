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

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

// GET /api/dashboard/patrimonio-mensual?months=6
router.get("/patrimonio-mensual", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const months = parseInt((req.query.months as string) || "6");

    const desde = new Date();
    desde.setMonth(desde.getMonth() - (months - 1));
    desde.setDate(1);
    const desdeStr = desde.toISOString().slice(0, 10);

    const { rows } = await pool.query(
      `SELECT costo, f_alta FROM activos
        WHERE estatus != 0 AND f_alta IS NOT NULL AND f_alta >= $1
        ORDER BY f_alta ASC`,
      [desdeStr]
    );

    const buckets = new Map<string, { costos: number[]; key: string }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(desde);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, { costos: [], key });
    }

    for (const row of rows) {
      const f = row.f_alta instanceof Date ? row.f_alta.toISOString() : String(row.f_alta);
      const key = f.slice(0, 7);
      const bucket = buckets.get(key);
      if (bucket) bucket.costos.push(Number(row.costo) || 0);
    }

    const data = Array.from(buckets.values()).map(({ costos, key }) => {
      const [y, m] = key.split("-");
      const mes = `${MESES_CORTOS[Number(m) - 1]} ${y}`;
      if (costos.length === 0) return { mes, open: 0, high: 0, low: 0, close: 0, altas: 0 };
      return {
        mes,
        open: costos[0],
        close: costos[costos.length - 1],
        high: Math.max(...costos),
        low: Math.min(...costos),
        altas: costos.length,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error("patrimonio-mensual error:", err);
    res.status(500).json({ error: "Error al obtener patrimonio mensual" });
  }
});

// GET /api/dashboard/estatus-distribucion
router.get("/estatus-distribucion", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT estatus, COUNT(*) AS cantidad FROM activos
        WHERE tipo IN (1,2) AND estatus IN (1,2,3)
        GROUP BY estatus`
    );
    const countMap: Record<number, number> = {};
    for (const row of rows) countMap[row.estatus] = parseInt(row.cantidad);

    res.json({
      data: [
        { estatus: "Activo", cantidad: countMap[1] || 0 },
        { estatus: "Almacén", cantidad: countMap[2] || 0 },
        { estatus: "Pre-Baja", cantidad: countMap[3] || 0 },
      ],
    });
  } catch (err) {
    console.error("estatus-distribucion error:", err);
    res.status(500).json({ error: "Error al obtener distribución por estatus" });
  }
});

// GET /api/dashboard/top-clasificaciones?limit=6
router.get("/top-clasificaciones", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt((req.query.limit as string) || "6");
    const { rows } = await pool.query(
      `SELECT COALESCE(c.clasificacion, '#' || a.clasificacion::text) AS nombre, COUNT(*) AS cantidad
         FROM activos a
         LEFT JOIN clasificacion c ON c.id_clasificacion = a.clasificacion
        WHERE a.estatus != 0 AND a.clasificacion IS NOT NULL
        GROUP BY nombre
        ORDER BY cantidad DESC
        LIMIT $1`,
      [limit]
    );
    res.json({ data: rows.map((r) => ({ nombre: r.nombre, cantidad: parseInt(r.cantidad) })) });
  } catch (err) {
    console.error("top-clasificaciones error:", err);
    res.status(500).json({ error: "Error al obtener top de clasificaciones" });
  }
});

export default router;
