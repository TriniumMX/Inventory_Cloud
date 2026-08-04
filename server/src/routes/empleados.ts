import { Router, Request, Response } from "express";
import fetch from "node-fetch";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";

const router = Router();

const SOAP_URL = process.env.SOAP_EMPLEADOS_URL || "http://172.16.0.7:8082/ServiceEmp/ServiceEmp.svc";
const NS_EMP   = "http://schemas.datacontract.org/2004/07/WcfServiceEmp";

interface EmpleadoData {
  nomina: string;
  nombre: string;
  departamento?: string;
  puesto?: string;
  activo?: string;
}

async function fetchEmpleadoSOAP(nomina: string): Promise<EmpleadoData | null> {
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tem="http://tempuri.org/"
               xmlns:emp="${NS_EMP}">
  <soap:Header/>
  <soap:Body>
    <tem:GetEmpleado>
      <tem:emp>
        <emp:num_nom>${nomina}</emp:num_nom>
      </tem:emp>
    </tem:GetEmpleado>
  </soap:Body>
</soap:Envelope>`;

  try {
    const response = await fetch(SOAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://tempuri.org/IEmpleado/GetEmpleado",
      },
      body: soapBody,
    });

    if (!response.ok) return null;

    const xml = await response.text();

    const extract = (tag: string): string => {
      const match = xml.match(new RegExp(`<[^>]*:?${tag}[^>]*>([^<]*)<`));
      return match ? match[1].trim() : "";
    };

    const nombre        = extract("nombre");
    const aPaterno      = extract("a_paterno");
    const aMaterno      = extract("a_materno");
    const numNom        = extract("num_nom");
    const nombreCompleto = [nombre, aPaterno, aMaterno].filter(Boolean).join(" ");

    if (!nombreCompleto) return null;

    return {
      nomina:       numNom || nomina,
      nombre:       nombreCompleto,
      departamento: extract("departamento") || extract("depto") || undefined,
      puesto:       extract("puesto") || undefined,
      activo:       extract("activo") || undefined,
    };
  } catch {
    return null;
  }
}

// GET /api/empleados/bajas
// Must be defined BEFORE /:nomina so Express doesn't capture "bajas" as a nomina param
router.get("/bajas", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    // All distinct nominas that still have assets with active status
    const result = await pool.query<{ nomina: string; total_bienes: string }>(`
      SELECT ultimo_nomina AS nomina,
             COUNT(*)      AS total_bienes
      FROM   activos
      WHERE  estatus != 0
        AND  ultimo_nomina IS NOT NULL
        AND  ultimo_nomina != ''
      GROUP  BY ultimo_nomina
      ORDER  BY COUNT(*) DESC
    `);

    const rows = result.rows;
    if (rows.length === 0) {
      res.json({ data: { items: [] } });
      return;
    }

    // Resolve SOAP in parallel batches of 15
    const BATCH = 15;
    const empleadosBaja: Array<EmpleadoData & { totalBienes: number }> = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch   = rows.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((r) => fetchEmpleadoSOAP(r.nomina))
      );

      for (let j = 0; j < batch.length; j++) {
        const r   = results[j];
        const row: { nomina: string; total_bienes: string } = batch[j];
        if (r.status === "fulfilled" && r.value) {
          const emp = r.value;
          // Include only if NOT active (activo !== "A")
          if (emp.activo !== "A") {
            empleadosBaja.push({
              ...emp,
              nomina:      row.nomina,
              totalBienes: parseInt(row.total_bienes, 10),
            });
          }
        }
      }
    }

    res.json({ data: { items: empleadosBaja } });
  } catch (err: any) {
    console.error("[empleados/bajas] Error:", err?.message || err);
    res.status(500).json({ error: "No se pudo obtener la lista de empleados dados de baja" });
  }
});

// GET /api/empleados/:nomina
router.get("/:nomina", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nomina } = req.params;
    console.log(`[empleados] Buscando nómina: ${nomina}`);

    const empleado = await fetchEmpleadoSOAP(nomina);

    if (!empleado) {
      console.warn(`[empleados] Nómina ${nomina} no encontrada o sin nombre en respuesta`);
      res.status(404).json({ error: `No se encontró empleado con nómina '${nomina}'` });
      return;
    }

    res.json(empleado);
  } catch (err: any) {
    console.error("[empleados] Error:", err?.message || err);
    const msg =
      err?.code === "ECONNREFUSED" || err?.code === "ENOTFOUND"
        ? "No se puede conectar al servicio de empleados. Verifica que el servidor RH esté activo."
        : `Error al obtener empleado: ${err?.message || "desconocido"}`;
    res.status(500).json({ error: msg });
  }
});

export default router;
