/**
 * migrate-sqlserver.js
 *
 * Migra registros FALTANTES de SQL Server (ACTIVO) → PostgreSQL (inventory + inventory_QA).
 * No modifica registros que ya existen en PG.
 *
 * Orden: USUARIOS → ACTIVOS → RESGUARDOS
 *
 * Uso:
 *   cd server
 *   node scripts/migrate-sqlserver.js
 *
 * Las credenciales se leen del .env en el directorio server/.
 */

require("dotenv").config();
const sql = require("mssql");
const { Client } = require("pg");

// ─── Configuración ────────────────────────────────────────────────────────────

const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
  },
  connectionTimeout: 30000,
  requestTimeout: 60000,
};

const PG_TARGETS = [
  {
    name: "inventory_QA",
    url: process.env.DATABASE_URL, // .env apunta a inventory_QA
  },
  {
    name: "inventory",
    url: (process.env.DATABASE_URL || "").replace("inventory_QA", "inventory"),
  },
];

const BATCH_SIZE = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function safeStr(v, max) {
  if (v == null) return null;
  const s = String(v).trim();
  return max ? s.substring(0, max) : s;
}

function safeDecimal(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function safeSmallint(v, def = 1) {
  if (v == null) return def;
  const n = parseInt(v);
  return isNaN(n) ? def : n;
}

function safeBool(v) {
  if (v == null) return true;
  return v === true || v === 1 || v === "1";
}

function safeDate(v) {
  if (v == null) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ─── Migración de USUARIOS ────────────────────────────────────────────────────

async function migrateUsuarios(pool, pgClient, pgName) {
  log(`[${pgName}] Iniciando migración de USUARIOS...`);

  const existing = await pgClient.query("SELECT usuario FROM usuarios");
  const existingSet = new Set(existing.rows.map((r) => r.usuario));

  const result = await pool.request().query("SELECT * FROM USUARIOS");
  const rows = result.recordset;

  let inserted = 0;
  let skipped = 0;
  const errors = [];

  for (const row of rows) {
    const usuario = safeStr(row.usuario || row.USUARIO, 100);
    if (!usuario || existingSet.has(usuario)) {
      skipped++;
      continue;
    }

    try {
      await pgClient.query(
        `INSERT INTO usuarios (id_usuario, nombre, usuario, password, password_hash, permisos)
         VALUES ($1, $2, $3, $4, NULL, $5)
         ON CONFLICT (id_usuario) DO NOTHING`,
        [
          safeSmallint(row.id_usuario || row.ID_USUARIO),
          safeStr(row.nombre || row.NOMBRE, 200),
          usuario,
          safeStr(row.password || row.PASSWORD),
          safeSmallint(row.permisos || row.PERMISOS, 3),
        ]
      );
      inserted++;
    } catch (e) {
      errors.push({ usuario, error: e.message });
    }
  }

  log(`[${pgName}] USUARIOS — insertados: ${inserted} | omitidos: ${skipped} | errores: ${errors.length}`);
  if (errors.length) errors.forEach((e) => log(`  ERROR usuario ${e.usuario}: ${e.error}`));
  return { inserted, skipped, errors: errors.length };
}

// ─── Migración de ACTIVOS ─────────────────────────────────────────────────────

async function migrateActivos(pool, pgClient, pgName) {
  log(`[${pgName}] Iniciando migración de ACTIVOS...`);

  // Contar total en SQL Server
  const countResult = await pool.request().query("SELECT COUNT(*) as total FROM ACTIVOS");
  const total = countResult.recordset[0].total;
  log(`[${pgName}] Total activos en SQL Server: ${total}`);

  // Números de inventario ya existentes en PG
  const existingResult = await pgClient.query(
    "SELECT numero_inventario FROM activos WHERE numero_inventario IS NOT NULL"
  );
  const existingSet = new Set(existingResult.rows.map((r) => r.numero_inventario));
  log(`[${pgName}] Activos existentes en PG: ${existingSet.size}`);

  let inserted = 0;
  let skipped = 0;
  const errors = [];
  let offset = 0;

  while (offset < total) {
    const batchResult = await pool.request().query(
      `SELECT * FROM ACTIVOS ORDER BY id_consecutivo
       OFFSET ${offset} ROWS FETCH NEXT ${BATCH_SIZE} ROWS ONLY`
    );
    const rows = batchResult.recordset;
    if (rows.length === 0) break;

    for (const row of rows) {
      const numInv = safeStr(
        row.numero_inventario || row.NUMERO_INVENTARIO,
        50
      );

      if (numInv && existingSet.has(numInv)) {
        skipped++;
        continue;
      }

      try {
        // Insertar en staging
        await pgClient.query(
          `INSERT INTO activos_stg
             (id_consecutivo, numero_inventario, descripcion, marca, modelo, numero_serie,
              clasificacion, id_cta_contable, costo, f_alta, f_factura, folio_factura,
              estatus, tipo, ultimo_nomina, observaciones)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            String(safeSmallint(row.id_consecutivo || row.ID_CONSECUTIVO)),
            numInv,
            safeStr(row.descripcion || row.DESCRIPCION),
            safeStr(row.marca || row.MARCA, 100),
            safeStr(row.modelo || row.MODELO, 100),
            safeStr(row.numero_serie || row.NUMERO_SERIE, 100),
            String(safeSmallint(row.clasificacion || row.CLASIFICACION)),
            String(safeSmallint(row.id_cta_contable || row.ID_CTA_CONTABLE)),
            String(safeDecimal(row.costo || row.COSTO) ?? ""),
            safeDate(row.f_alta || row.F_ALTA),
            safeDate(row.f_factura || row.F_FACTURA),
            safeStr(row.folio_factura || row.FOLIO_FACTURA, 100),
            String(safeSmallint(row.estatus || row.ESTATUS, 1)),
            String(safeSmallint(row.tipo || row.TIPO, 1)),
            safeStr(row.ultimo_nomina || row.ULTIMO_NOMINA, 30),
            safeStr(row.observaciones || row.OBSERVACIONES),
          ]
        );

        // Promover de staging a activos
        const promResult = await pgClient.query(
          `INSERT INTO activos
             (id_consecutivo, numero_inventario, descripcion, marca, modelo, numero_serie,
              clasificacion, id_cta_contable, costo, f_alta, f_factura, folio_factura,
              estatus, tipo, ultimo_nomina, observaciones)
           SELECT
             id_consecutivo::INTEGER,
             numero_inventario,
             descripcion,
             marca,
             modelo,
             numero_serie,
             NULLIF(clasificacion,'')::INTEGER,
             NULLIF(id_cta_contable,'')::INTEGER,
             NULLIF(costo,'')::NUMERIC,
             NULLIF(f_alta,'')::TIMESTAMPTZ,
             NULLIF(f_factura,'')::DATE,
             folio_factura,
             COALESCE(NULLIF(estatus,'')::SMALLINT, 1),
             COALESCE(NULLIF(tipo,'')::SMALLINT, 1),
             ultimo_nomina,
             observaciones
           FROM activos_stg
           WHERE numero_inventario IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM activos a WHERE a.numero_inventario = activos_stg.numero_inventario
             )
           ON CONFLICT DO NOTHING
           RETURNING id_consecutivo`,
          []
        );

        await pgClient.query("TRUNCATE activos_stg");

        if (promResult.rowCount > 0) {
          inserted++;
          if (numInv) existingSet.add(numInv);
        } else {
          skipped++;
        }
      } catch (e) {
        errors.push({ numInv, error: e.message });
        await pgClient.query("TRUNCATE activos_stg").catch(() => {});
      }
    }

    offset += rows.length;
    log(`[${pgName}] ACTIVOS progreso: ${offset}/${total} | insertados: ${inserted} | omitidos: ${skipped}`);
  }

  log(`[${pgName}] ACTIVOS — insertados: ${inserted} | omitidos: ${skipped} | errores: ${errors.length}`);
  if (errors.length > 0) {
    errors.slice(0, 10).forEach((e) => log(`  ERROR activo ${e.numInv}: ${e.error}`));
    if (errors.length > 10) log(`  ... y ${errors.length - 10} errores más`);
  }
  return { inserted, skipped, errors: errors.length };
}

// ─── Migración de RESGUARDOS ──────────────────────────────────────────────────

async function migrateResguardos(pool, pgClient, pgName) {
  log(`[${pgName}] Iniciando migración de RESGUARDOS...`);

  const countResult = await pool.request().query("SELECT COUNT(*) as total FROM RESGUARDOS");
  const total = countResult.recordset[0].total;
  log(`[${pgName}] Total resguardos en SQL Server: ${total}`);

  const existingResult = await pgClient.query(
    "SELECT id_resguardo FROM resguardos WHERE id_resguardo IS NOT NULL"
  );
  const existingIds = new Set(existingResult.rows.map((r) => r.id_resguardo));
  log(`[${pgName}] Resguardos existentes en PG: ${existingIds.size}`);

  let inserted = 0;
  let skipped = 0;
  const errors = [];
  let offset = 0;

  while (offset < total) {
    const batchResult = await pool.request().query(
      `SELECT * FROM RESGUARDOS ORDER BY id_resguardo
       OFFSET ${offset} ROWS FETCH NEXT ${BATCH_SIZE} ROWS ONLY`
    );
    const rows = batchResult.recordset;
    if (rows.length === 0) break;

    for (const row of rows) {
      const id = safeSmallint(row.id_resguardo || row.ID_RESGUARDO);
      if (!id || existingIds.has(id)) {
        skipped++;
        continue;
      }

      try {
        await pgClient.query(
          `INSERT INTO resguardos (id_resguardo, folio, nomina, numero_inventario, fecha, estatus, id_usuario)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id_resguardo) DO NOTHING`,
          [
            id,
            safeStr(row.folio || row.FOLIO, 50),
            safeStr(row.nomina || row.NOMINA, 30),
            safeStr(row.numero_inventario || row.NUMERO_INVENTARIO, 50),
            safeDate(row.fecha || row.FECHA),
            safeBool(row.estatus || row.ESTATUS),
            safeSmallint(row.id_usuario || row.ID_USUARIO) || null,
          ]
        );
        inserted++;
        existingIds.add(id);
      } catch (e) {
        errors.push({ id, error: e.message });
      }
    }

    offset += rows.length;
    log(`[${pgName}] RESGUARDOS progreso: ${offset}/${total} | insertados: ${inserted} | omitidos: ${skipped}`);
  }

  log(`[${pgName}] RESGUARDOS — insertados: ${inserted} | omitidos: ${skipped} | errores: ${errors.length}`);
  if (errors.length > 0) {
    errors.slice(0, 10).forEach((e) => log(`  ERROR resguardo ${e.id}: ${e.error}`));
    if (errors.length > 10) log(`  ... y ${errors.length - 10} errores más`);
  }
  return { inserted, skipped, errors: errors.length };
}

// ─── Verificación post-migración ──────────────────────────────────────────────

async function verify(pgClient, pgName) {
  log(`\n[${pgName}] === VERIFICACIÓN POST-MIGRACIÓN ===`);

  const counts = await pgClient.query(`
    SELECT 'activos' as t, COUNT(*) as n FROM activos
    UNION ALL SELECT 'resguardos', COUNT(*) FROM resguardos
    UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
  `);
  counts.rows.forEach((r) => log(`  ${r.t}: ${r.n} registros`));

  const huerfanosClasif = await pgClient.query(`
    SELECT COUNT(*) as n FROM activos
    WHERE clasificacion IS NOT NULL
      AND clasificacion NOT IN (SELECT id_clasificacion FROM clasificacion)
  `);
  log(`  Activos con clasificacion huérfana: ${huerfanosClasif.rows[0].n}`);

  const huerfanosCta = await pgClient.query(`
    SELECT COUNT(*) as n FROM activos
    WHERE id_cta_contable IS NOT NULL
      AND id_cta_contable NOT IN (SELECT id_ctacontable FROM ctas_contables)
  `);
  log(`  Activos con cta_contable huérfana: ${huerfanosCta.rows[0].n}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("=== INICIO DE MIGRACIÓN SQL Server → PostgreSQL ===");
  log(`SQL Server: ${sqlConfig.server}/${sqlConfig.database}`);

  // Conectar a SQL Server
  log("Conectando a SQL Server...");
  const pool = await sql.connect(sqlConfig);
  log("SQL Server conectado.");

  const report = {};

  for (const target of PG_TARGETS) {
    log(`\n──────────────────────────────────────────`);
    log(`Destino: ${target.name} (${target.url?.split("@")[1] ?? ""})`);
    log(`──────────────────────────────────────────`);

    const pgClient = new Client({ connectionString: target.url });
    await pgClient.connect();

    report[target.name] = {};
    report[target.name].usuarios  = await migrateUsuarios(pool, pgClient, target.name);
    report[target.name].activos   = await migrateActivos(pool, pgClient, target.name);
    report[target.name].resguardos = await migrateResguardos(pool, pgClient, target.name);

    await verify(pgClient, target.name);
    await pgClient.end();
  }

  await sql.close();

  log("\n=== REPORTE FINAL ===");
  for (const [db, tables] of Object.entries(report)) {
    log(`\n${db}:`);
    for (const [tabla, stats] of Object.entries(tables)) {
      log(`  ${tabla}: +${stats.inserted} insertados | ${stats.skipped} omitidos | ${stats.errors} errores`);
    }
  }
  log("\n=== MIGRACIÓN COMPLETADA ===");
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
