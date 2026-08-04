import { Router, Request, Response } from "express";
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

// GET /api/resguardos?folio=XX
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { folio } = req.query as Record<string, string>;

    let sql = "SELECT * FROM resguardos WHERE estatus = true";
    const params: unknown[] = [];

    if (folio) {
      sql += " AND folio ILIKE $1";
      params.push(`%${folio}%`);
    }

    sql += " ORDER BY fecha DESC";
    const { rows } = await pool.query(sql, params);

    const groupedMap = new Map<string, { folio: string; nomina: string; fecha: string; estatus: boolean; idUsuario: number; activos: string[] }>();
    for (const row of rows) {
      if (!groupedMap.has(row.folio)) {
        groupedMap.set(row.folio, {
          folio: row.folio,
          nomina: row.nomina,
          fecha: row.fecha,
          estatus: row.estatus,
          idUsuario: row.id_usuario,
          activos: [],
        });
      }
      groupedMap.get(row.folio)!.activos.push(row.numero_inventario);
    }

    res.json({ data: { items: Array.from(groupedMap.values()) } });
  } catch (err) {
    console.error("listResguardos error:", err);
    res.status(500).json({ error: "Error al obtener resguardos" });
  }
});

// POST /api/resguardos
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { folio, nomina, numerosInventario, idUsuario } = req.body as {
      folio: string;
      nomina: string;
      numerosInventario: string[];
      idUsuario: number;
    };

    await client.query("BEGIN");

    const fecha = new Date().toISOString();
    for (const numInv of numerosInventario) {
      await client.query(
        "INSERT INTO resguardos (folio, nomina, numero_inventario, fecha, estatus, id_usuario) VALUES ($1,$2,$3,$4,true,$5)",
        [folio, nomina, numInv, fecha, idUsuario]
      );
    }

    await client.query(
      "UPDATE activos SET ultimo_nomina = $1 WHERE numero_inventario = ANY($2)",
      [nomina, numerosInventario]
    );

    await client.query("COMMIT");

    // Auditoría: un log por cada bien asignado
    const logInserts = numerosInventario.map((numInv) =>
      auditLog(
        "resguardos", folio, "CREATE", "asignacion",
        null, `${numInv} → ${nomina}`,
        req.user!, req.ip
      )
    );
    await Promise.all(logInserts);

    res.status(201).json({ data: null });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createResguardo error:", err);
    res.status(500).json({ error: "Error al crear resguardo" });
  } finally {
    client.release();
  }
});

// POST /api/resguardos/reasignar
router.post("/reasignar", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { numeroInventario, nuevoDestinatario, idUsuario } = req.body as {
      numeroInventario: string;
      nuevoDestinatario: string;
      idUsuario: number;
    };

    await client.query("BEGIN");

    // Obtener destinatario anterior
    const { rows: prevRows } = await client.query(
      "SELECT nomina FROM resguardos WHERE numero_inventario = $1 AND estatus = true LIMIT 1",
      [numeroInventario]
    );
    const nominaAnterior = prevRows[0]?.nomina || null;

    // Desactivar resguardo actual
    await client.query(
      "UPDATE resguardos SET estatus = false WHERE numero_inventario = $1 AND estatus = true",
      [numeroInventario]
    );

    // Generar nuevo folio
    const year = new Date().getFullYear();
    const { rows: maxRows } = await client.query(
      "SELECT folio FROM resguardos WHERE folio ILIKE $1 ORDER BY folio DESC LIMIT 1",
      [`RS-${year}-%`]
    );
    let nextNumber = 1;
    if (maxRows.length > 0 && maxRows[0].folio) {
      const match = maxRows[0].folio.match(/RS-\d{4}-(\d+)/);
      if (match) nextNumber = parseInt(match[1]) + 1;
    }
    const folio = `RS-${year}-${String(nextNumber).padStart(5, "0")}`;

    // Insertar nuevo resguardo
    await client.query(
      "INSERT INTO resguardos (folio, numero_inventario, nomina, fecha, estatus, id_usuario) VALUES ($1,$2,$3,$4,true,$5)",
      [folio, numeroInventario, nuevoDestinatario, new Date().toISOString(), idUsuario]
    );

    // Actualizar activo
    await client.query(
      "UPDATE activos SET ultimo_nomina = $1 WHERE numero_inventario = $2",
      [nuevoDestinatario, numeroInventario]
    );

    await client.query("COMMIT");

    await auditLog(
      "resguardos", numeroInventario, "UPDATE", "nomina",
      nominaAnterior, nuevoDestinatario,
      req.user!, req.ip
    );

    res.json({ data: null });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("reasignar error:", err);
    res.status(500).json({ error: "Error al reasignar bien" });
  } finally {
    client.release();
  }
});

// POST /api/resguardos/traspasar
router.post("/traspasar", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { nominaOrigen, nominaDestino, idUsuario } = req.body as {
      nominaOrigen: string;
      nominaDestino: string;
      idUsuario: number;
    };

    await client.query("BEGIN");

    // Obtener todos los activos del origen
    const { rows: activosRows } = await client.query(
      "SELECT numero_inventario FROM activos WHERE ultimo_nomina = $1 AND estatus != 0",
      [nominaOrigen]
    );

    if (activosRows.length === 0) {
      await client.query("ROLLBACK");
      res.json({ data: { transferidos: 0 } });
      return;
    }

    const numerosInventario = activosRows.map((r: { numero_inventario: string }) => r.numero_inventario).filter(Boolean);
    const year = new Date().getFullYear();

    // Desactivar resguardos activos
    await client.query(
      "UPDATE resguardos SET estatus = false WHERE numero_inventario = ANY($1) AND estatus = true",
      [numerosInventario]
    );

    // Generar folio de traspaso
    const { rows: maxRows } = await client.query(
      "SELECT folio FROM resguardos WHERE folio ILIKE $1 ORDER BY folio DESC LIMIT 1",
      [`TM-${year}-%`]
    );
    let nextNumber = 1;
    if (maxRows.length > 0 && maxRows[0].folio) {
      const match = maxRows[0].folio.match(/TM-\d{4}-(\d+)/);
      if (match) nextNumber = parseInt(match[1]) + 1;
    }
    const folioTraspaso = `TM-${year}-${String(nextNumber).padStart(5, "0")}`;
    const fecha = new Date().toISOString();

    // Insertar nuevos resguardos en lote
    for (const numInv of numerosInventario) {
      await client.query(
        "INSERT INTO resguardos (folio, numero_inventario, nomina, fecha, estatus, id_usuario) VALUES ($1,$2,$3,$4,true,$5)",
        [folioTraspaso, numInv, nominaDestino, fecha, idUsuario]
      );
    }

    // Actualizar activos
    await client.query(
      "UPDATE activos SET ultimo_nomina = $1 WHERE numero_inventario = ANY($2)",
      [nominaDestino, numerosInventario]
    );

    await client.query("COMMIT");

    // Auditoría: un log por el traspaso completo
    await auditLog(
      "resguardos", folioTraspaso, "TRASPASAR", "nomina",
      nominaOrigen, nominaDestino,
      req.user!, req.ip
    );

    res.json({ data: { transferidos: numerosInventario.length } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("traspasar error:", err);
    res.status(500).json({ error: "Error al traspasar inventario" });
  } finally {
    client.release();
  }
});

export default router;
