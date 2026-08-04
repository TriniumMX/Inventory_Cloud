"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_fetch_1 = __importDefault(require("node-fetch"));
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const SOAP_URL = process.env.SOAP_EMPLEADOS_URL || "http://172.16.0.7:8082/ServiceEmp/ServiceEmp.svc";
const NS_EMP = "http://schemas.datacontract.org/2004/07/WcfServiceEmp";
async function fetchEmpleadoSOAP(nomina) {
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
        const response = await (0, node_fetch_1.default)(SOAP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                SOAPAction: "http://tempuri.org/IEmpleado/GetEmpleado",
            },
            body: soapBody,
        });
        if (!response.ok)
            return null;
        const xml = await response.text();
        const extract = (tag) => {
            const match = xml.match(new RegExp(`<[^>]*:?${tag}[^>]*>([^<]*)<`));
            return match ? match[1].trim() : "";
        };
        const nombre = extract("nombre");
        const aPaterno = extract("a_paterno");
        const aMaterno = extract("a_materno");
        const numNom = extract("num_nom");
        const nombreCompleto = [nombre, aPaterno, aMaterno].filter(Boolean).join(" ");
        if (!nombreCompleto)
            return null;
        return {
            nomina: numNom || nomina,
            nombre: nombreCompleto,
            departamento: extract("departamento") || extract("depto") || undefined,
            puesto: extract("puesto") || undefined,
            activo: extract("activo") || undefined,
        };
    }
    catch {
        return null;
    }
}
// GET /api/empleados/bajas
// Must be defined BEFORE /:nomina so Express doesn't capture "bajas" as a nomina param
router.get("/bajas", auth_1.requireAuth, async (req, res) => {
    try {
        // All distinct nominas that still have assets with active status
        const result = await db_1.pool.query(`
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
        const empleadosBaja = [];
        for (let i = 0; i < rows.length; i += BATCH) {
            const batch = rows.slice(i, i + BATCH);
            const results = await Promise.allSettled(batch.map((r) => fetchEmpleadoSOAP(r.nomina)));
            for (let j = 0; j < batch.length; j++) {
                const r = results[j];
                const row = batch[j];
                if (r.status === "fulfilled" && r.value) {
                    const emp = r.value;
                    // Include only if NOT active (activo !== "A")
                    if (emp.activo !== "A") {
                        empleadosBaja.push({
                            ...emp,
                            nomina: row.nomina,
                            totalBienes: parseInt(row.total_bienes, 10),
                        });
                    }
                }
            }
        }
        res.json({ data: { items: empleadosBaja } });
    }
    catch (err) {
        console.error("[empleados/bajas] Error:", err?.message || err);
        res.status(500).json({ error: "No se pudo obtener la lista de empleados dados de baja" });
    }
});
// GET /api/empleados/:nomina
router.get("/:nomina", auth_1.requireAuth, async (req, res) => {
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
    }
    catch (err) {
        console.error("[empleados] Error:", err?.message || err);
        const msg = err?.code === "ECONNREFUSED" || err?.code === "ENOTFOUND"
            ? "No se puede conectar al servicio de empleados. Verifica que el servidor RH esté activo."
            : `Error al obtener empleado: ${err?.message || "desconocido"}`;
        res.status(500).json({ error: msg });
    }
});
exports.default = router;
