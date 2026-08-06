import { Router, Request, Response } from "express";
import multer from "multer";
import { pool } from "../db";
import { requireAuth, requireModulo } from "../middleware/auth";
import { supabaseAdmin } from "../supabaseAdmin";

const router = Router();

// Normalize DB values to a stable audit string for comparison
function toAuditStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString().substring(0, 10);
  const s = String(val).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!isNaN(n)) return String(n);
  return s;
}

// PDFs de escrituras: en memoria (nunca tocan disco) y se suben a Supabase
// Storage con la service role key — el navegador nunca habla con Storage
// directo, ni el anon key. El bucket "escrituras" queda con RLS cerrada.
const ESCRITURAS_BUCKET = "escrituras";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Solo se permiten archivos PDF"));
  },
});

// El mimetype lo declara el cliente y es falsificable — se valida además la
// firma real del archivo (los PDF siempre empiezan con "%PDF-").
function looksLikePdf(buf: Buffer): boolean {
  return buf.length > 4 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
}

// GET /api/inmuebles/tipos
router.get("/tipos", requireAuth, requireModulo("bienes-inmuebles", false), async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query("SELECT id, nombre, descripcion FROM tipos_inmueble ORDER BY nombre");
    res.json({ data: rows.map((r) => ({ id: r.id, nombre: r.nombre, descripcion: r.descripcion })) });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener tipos de inmueble" });
  }
});

// GET /api/inmuebles/check-inventario?numero=XX&excludeId=YY
router.get("/check-inventario", requireAuth, requireModulo("bienes-inmuebles", false), async (req: Request, res: Response): Promise<void> => {
  try {
    const { numero, excludeId } = req.query as Record<string, string>;
    const params: unknown[] = [numero];
    let sql = "SELECT id FROM bienes_inmuebles WHERE numero_inventario = $1 AND estatus != 0";
    if (excludeId) { sql += " AND id != $2"; params.push(parseInt(excludeId)); }
    sql += " LIMIT 1";
    const { rows } = await pool.query(sql, params);
    res.json({ data: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "Error al verificar número de inventario" });
  }
});

// GET /api/inmuebles
router.get("/", requireAuth, requireModulo("bienes-inmuebles", false), async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT bi.*,
              ti.nombre AS tipo_nombre,
              ct.cta_contable, ct.descripcion AS cta_descripcion
       FROM bienes_inmuebles bi
       LEFT JOIN tipos_inmueble ti ON ti.id = bi.id_tipo_inmueble
       LEFT JOIN ctas_contables ct ON ct.id_ctacontable = bi.id_cta_contable
       WHERE bi.estatus != 0
       ORDER BY bi.id DESC`
    );

    const items = rows.map((row) => ({
      id: row.id,
      numeroInventario: row.numero_inventario,
      nombre: row.nombre,
      descripcion: row.descripcion,
      idTipoInmueble: row.id_tipo_inmueble,
      tipoNombre: row.tipo_nombre,
      usoActual: row.uso_actual,
      niveles: row.niveles,
      direccion: row.direccion,
      colonia: row.colonia,
      codigoPostal: row.codigo_postal,
      municipio: row.municipio,
      estado: row.estado,
      latitud: row.latitud,
      longitud: row.longitud,
      superficieTerreno: row.superficie_terreno !== null ? Number(row.superficie_terreno) : null,
      superficieConstruccion: row.superficie_construccion !== null ? Number(row.superficie_construccion) : null,
      numeroEscritura: row.numero_escritura,
      fechaEscritura: row.fecha_escritura,
      notaria: row.notaria,
      volumenLibro: row.volumen_libro,
      folioRegistro: row.folio_registro,
      claveCatastral: row.clave_catastral,
      valorCatastral: row.valor_catastral,
      valorComercial: row.valor_comercial,
      costoAdquisicion: row.costo_adquisicion,
      fechaAdquisicion: row.fecha_adquisicion,
      idCuentaContable: row.id_cta_contable,
      ctaContableNombre: row.cta_contable ? `${row.cta_contable} - ${row.cta_descripcion}` : null,
      responsableNomina: row.responsable_nomina,
      estatus: row.estatus,
      observaciones: row.observaciones,
      fechaRegistro: row.fecha_registro,
      fechaModificacion: row.fecha_modificacion,
      escrituraUrl: row.escritura_url,
    }));

    res.json({ data: items });
  } catch (err) {
    console.error("listInmuebles error:", err);
    res.status(500).json({ error: "Error al obtener inmuebles" });
  }
});

// POST /api/inmuebles
router.post("/", requireAuth, requireModulo("bienes-inmuebles", true), async (req: Request, res: Response): Promise<void> => {
  try {
    const dto = req.body;
    const p = (v?: string) => (v && v !== "" ? parseFloat(v) : null);
    const pi = (v?: string) => (v && v !== "" ? parseInt(v) : null);

    const { rows: inserted } = await pool.query(
      `INSERT INTO bienes_inmuebles
         (numero_inventario, direccion, id_tipo_inmueble, estatus, nombre, descripcion, uso_actual, niveles,
          colonia, codigo_postal, municipio, estado, latitud, longitud, superficie_terreno, superficie_construccion,
          numero_escritura, fecha_escritura, notaria, volumen_libro, folio_registro, clave_catastral,
          valor_catastral, valor_comercial, costo_adquisicion, fecha_adquisicion,
          id_cta_contable, responsable_nomina, observaciones, fecha_registro)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,NOW())
       RETURNING id`,
      [
        dto.numeroInventario, dto.direccion, parseInt(dto.idTipoInmueble), parseInt(dto.estatus),
        dto.nombre || null, dto.descripcion || null, dto.usoActual || null, pi(dto.niveles),
        dto.colonia || null, dto.codigoPostal || null, dto.municipio || null, dto.estado || null,
        p(dto.latitud), p(dto.longitud), p(dto.superficieTerreno), p(dto.superficieConstruccion),
        dto.numeroEscritura || null, dto.fechaEscritura || null, dto.notaria || null,
        dto.volumenLibro || null, dto.folioRegistro || null, dto.claveCatastral || null,
        p(dto.valorCatastral), p(dto.valorComercial), p(dto.costoAdquisicion), dto.fechaAdquisicion || null,
        pi(dto.idCuentaContable), dto.responsableNomina || null, dto.observaciones || null,
      ]
    );

    const newId = inserted[0]?.id;
    await pool.query(
      `INSERT INTO audit_logs (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, id_usuario, usuario, nombre_usuario, ip_address)
       VALUES ('bienes_inmuebles', $1, 'CREATE', NULL, NULL, $2, $3, $4, $5, $6)`,
      [String(newId), dto.numeroInventario, req.user!.id, req.user!.usuario, req.user!.nombre, req.ip || null]
    );

    res.status(201).json({ data: null });
  } catch (err) {
    console.error("createInmueble error:", err);
    res.status(500).json({ error: "Error al crear inmueble" });
  }
});

// PATCH /api/inmuebles/:id
router.patch("/:id", requireAuth, requireModulo("bienes-inmuebles", true), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const dto = req.body;
    const p = (v?: string) => (v && v !== "" ? parseFloat(v) : null);
    const pi = (v?: string) => (v && v !== "" ? parseInt(v) : null);

    // Fetch current row to compare changes
    const { rows: current } = await pool.query(
      "SELECT * FROM bienes_inmuebles WHERE id = $1",
      [id]
    );
    if (!current[0]) { res.status(404).json({ error: "Inmueble no encontrado" }); return; }
    const prev = current[0];

    const setCols: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    const fieldMap: Record<string, unknown> = {
      numero_inventario: dto.numeroInventario,
      direccion: dto.direccion,
      id_tipo_inmueble: dto.idTipoInmueble !== undefined ? parseInt(dto.idTipoInmueble) : undefined,
      estatus: dto.estatus !== undefined ? parseInt(dto.estatus) : undefined,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      uso_actual: dto.usoActual,
      niveles: dto.niveles !== undefined ? pi(dto.niveles) : undefined,
      colonia: dto.colonia,
      codigo_postal: dto.codigoPostal,
      municipio: dto.municipio,
      estado: dto.estado,
      latitud: dto.latitud !== undefined ? p(dto.latitud) : undefined,
      longitud: dto.longitud !== undefined ? p(dto.longitud) : undefined,
      superficie_terreno: dto.superficieTerreno !== undefined ? p(dto.superficieTerreno) : undefined,
      superficie_construccion: dto.superficieConstruccion !== undefined ? p(dto.superficieConstruccion) : undefined,
      numero_escritura: dto.numeroEscritura,
      fecha_escritura: dto.fechaEscritura,
      notaria: dto.notaria,
      volumen_libro: dto.volumenLibro,
      folio_registro: dto.folioRegistro,
      clave_catastral: dto.claveCatastral,
      valor_catastral: dto.valorCatastral !== undefined ? p(dto.valorCatastral) : undefined,
      valor_comercial: dto.valorComercial !== undefined ? p(dto.valorComercial) : undefined,
      costo_adquisicion: dto.costoAdquisicion !== undefined ? p(dto.costoAdquisicion) : undefined,
      fecha_adquisicion: dto.fechaAdquisicion,
      id_cta_contable: dto.idCuentaContable !== undefined ? pi(dto.idCuentaContable) : undefined,
      responsable_nomina: dto.responsableNomina,
      observaciones: dto.observaciones,
    };

    for (const [col, val] of Object.entries(fieldMap)) {
      if (val !== undefined) {
        setCols.push(`${col} = $${i++}`);
        params.push(val === "" ? null : val);
      }
    }

    if (setCols.length === 0) { res.status(400).json({ error: "Sin campos para actualizar" }); return; }

    params.push(id);
    await pool.query(`UPDATE bienes_inmuebles SET ${setCols.join(", ")} WHERE id = $${i}`, params);

    // Log every changed field
    const logInserts: Promise<unknown>[] = [];
    for (const [col, newVal] of Object.entries(fieldMap)) {
      if (newVal === undefined) continue;
      const prevStr = toAuditStr(prev[col]);
      const newStr  = toAuditStr(newVal);
      if (prevStr !== newStr) {
        logInserts.push(
          pool.query(
            `INSERT INTO audit_logs (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, id_usuario, usuario, nombre_usuario, ip_address)
             VALUES ('bienes_inmuebles', $1, 'UPDATE', $2, $3, $4, $5, $6, $7, $8)`,
            [String(id), col, prevStr, newStr, req.user!.id, req.user!.usuario, req.user!.nombre, req.ip || null]
          )
        );
      }
    }
    await Promise.all(logInserts);

    res.json({ data: null });
  } catch (err) {
    console.error("updateInmueble error:", err);
    res.status(500).json({ error: "Error al actualizar inmueble" });
  }
});

// POST /api/inmuebles/:id/escritura — subir PDF a Supabase Storage
router.post("/:id/escritura", requireAuth, requireModulo("bienes-inmuebles", true), upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (!req.file) { res.status(400).json({ error: "No se envió ningún archivo" }); return; }
    if (!looksLikePdf(req.file.buffer)) { res.status(400).json({ error: "El archivo no es un PDF válido" }); return; }

    const { rows } = await pool.query("SELECT numero_inventario FROM bienes_inmuebles WHERE id = $1", [id]);
    if (!rows[0]) { res.status(404).json({ error: "Inmueble no encontrado" }); return; }

    const safeNum = rows[0].numero_inventario.replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName = `${safeNum}-escritura.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(ESCRITURAS_BUCKET)
      .upload(fileName, req.file.buffer, { upsert: true, contentType: "application/pdf" });
    if (uploadError) { throw uploadError; }

    await pool.query(
      "UPDATE bienes_inmuebles SET escritura_url = $1 WHERE id = $2",
      [fileName, id]
    );

    res.json({ data: { fileName } });
  } catch (err) {
    console.error("uploadEscritura error:", err);
    res.status(500).json({ error: "Error al subir escritura" });
  }
});

// DELETE /api/inmuebles/:id/escritura
router.delete("/:id/escritura", requireAuth, requireModulo("bienes-inmuebles", true), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await pool.query("SELECT escritura_url FROM bienes_inmuebles WHERE id = $1", [id]);
    if (!rows[0]) { res.status(404).json({ error: "Inmueble no encontrado" }); return; }

    if (rows[0].escritura_url) {
      await supabaseAdmin.storage.from(ESCRITURAS_BUCKET).remove([rows[0].escritura_url]);
    }

    await pool.query("UPDATE bienes_inmuebles SET escritura_url = NULL WHERE id = $1", [id]);
    res.json({ data: null });
  } catch (err) {
    console.error("deleteEscritura error:", err);
    res.status(500).json({ error: "Error al eliminar escritura" });
  }
});

// GET /api/inmuebles/:id/escritura/url — URL firmada y temporal para descargar el PDF
router.get("/:id/escritura/url", requireAuth, requireModulo("bienes-inmuebles", false), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await pool.query("SELECT escritura_url FROM bienes_inmuebles WHERE id = $1", [id]);
    if (!rows[0] || !rows[0].escritura_url) { res.status(404).json({ error: "Sin escritura" }); return; }

    const { data, error } = await supabaseAdmin.storage
      .from(ESCRITURAS_BUCKET)
      .createSignedUrl(rows[0].escritura_url, 600);
    if (error || !data) { throw error || new Error("No se pudo generar la URL"); }

    res.json({ data: { url: data.signedUrl } });
  } catch (err) {
    console.error("getEscrituraUrl error:", err);
    res.status(500).json({ error: "Error al obtener URL de escritura" });
  }
});

export default router;
