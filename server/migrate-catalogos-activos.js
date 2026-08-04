require('dotenv').config();
const sql = require('mssql');
const { Pool } = require('pg');

const sqlConfig = {
  user: process.env.DB_USER?.trim(),
  password: process.env.DB_PASSWORD?.trim(),
  server: process.env.DB_SERVER?.trim(),
  database: process.env.DB_DATABASE?.trim(),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateTable(pgClient, label, rows, insertFn) {
  let ok = 0, skip = 0;
  for (const row of rows) {
    await pgClient.query('SAVEPOINT sp');
    try {
      await insertFn(pgClient, row);
      await pgClient.query('RELEASE SAVEPOINT sp');
      ok++;
    } catch (err) {
      await pgClient.query('ROLLBACK TO SAVEPOINT sp');
      console.warn(`  [SKIP] ${label}: ${err.message.split('\n')[0]}`);
      skip++;
    }
  }
  console.log(`  ${label}: ${ok} insertados, ${skip} saltados`);
}

async function migrate() {
  console.log('Conectando SQL Server...');
  const sqlPool = await sql.connect(sqlConfig);

  // ── 1. CLASIFICACION ──────────────────────────────
  console.log('\n[1/3] Leyendo CLASIFICACION...');
  const clsRows = (await sqlPool.request().query('SELECT * FROM [CLASIFICACION]')).recordset;
  console.log(`  Filas: ${clsRows.length}`);

  // ── 2. CTAS_CONTABLES ─────────────────────────────
  console.log('[2/3] Leyendo CTAS_CONTABLES...');
  const ctaRows = (await sqlPool.request().query('SELECT * FROM [CTAS_CONTABLES]')).recordset;
  console.log(`  Filas: ${ctaRows.length}`);

  // ── 3. ACTIVOS tipo 1 o 2 ─────────────────────────
  console.log('[3/3] Leyendo ACTIVOS (tipo=1 OR tipo=2)...');
  const actRows = (await sqlPool.request().query('SELECT * FROM [ACTIVOS] WHERE tipo = 1 OR tipo = 2')).recordset;
  console.log(`  Filas: ${actRows.length}`);

  await sql.close();

  const pgClient = await pgPool.connect();
  try {
    await pgClient.query('BEGIN');

    // ── Insertar CLASIFICACION ────────────────────────
    console.log('\nMigrando clasificacion...');
    await migrateTable(pgClient, 'clasificacion', clsRows, async (c, row) => {
      await c.query(
        `INSERT INTO clasificacion (id_clasificacion, clasificacion, estatus)
         VALUES ($1, $2, 1)
         ON CONFLICT (id_clasificacion) DO NOTHING`,
        [row.id_clasificacion, row.clasificacion]
      );
    });
    // Reset sequence al máximo ID
    await pgClient.query(`SELECT setval('clasificacion_id_clasificacion_seq', (SELECT MAX(id_clasificacion) FROM clasificacion))`);

    // ── Insertar CTAS_CONTABLES ───────────────────────
    console.log('Migrando ctas_contables...');
    await migrateTable(pgClient, 'ctas_contables', ctaRows, async (c, row) => {
      await c.query(
        `INSERT INTO ctas_contables (id_ctacontable, cta_contable, descripcion, id_clasificacion_cta, estatus)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (id_ctacontable) DO NOTHING`,
        [row.id_ctacontable, row.cta_contable, row.descripcion, row.id_clasificacion_cta ?? null]
      );
    });

    // ── Insertar ACTIVOS ──────────────────────────────
    console.log('Migrando activos...');
    await migrateTable(pgClient, 'activos', actRows, async (c, row) => {
      const r = {};
      for (const k of Object.keys(row)) r[k.toLowerCase()] = row[k];

      await c.query(
        `INSERT INTO activos
          (numero_inventario, descripcion, marca, modelo, numero_serie,
           clasificacion, id_cta_contable, costo, f_alta, f_factura,
           folio_factura, estatus, tipo, ultimo_nomina, observaciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT DO NOTHING`,
        [
          r['numero_inventario'] ?? null,
          r['descripcion'] ?? null,
          r['marca'] ?? null,
          r['modelo'] ?? null,
          r['numero_serie'] ?? null,
          r['clasificacion'] ?? null,
          r['id_cta_contable'] ?? null,
          r['costo'] ?? null,
          r['f_alta'] ?? null,
          r['f_factura'] ?? null,
          r['folio_factura'] ?? null,
          r['estatus'] ?? 1,
          r['tipo'] ?? null,
          r['ultimo_nomina'] ?? null,
          r['observaciones'] ?? null,
        ]
      );
    });

    await pgClient.query('COMMIT');
    console.log('\nMigración completa.');

    // Verificación final
    const totals = await pgClient.query(
      `SELECT
        (SELECT COUNT(*) FROM clasificacion) AS cls,
        (SELECT COUNT(*) FROM ctas_contables) AS cta,
        (SELECT COUNT(*) FROM activos) AS act`
    );
    const t = totals.rows[0];
    console.log(`\nVerificación Postgres:`);
    console.log(`  clasificacion:  ${t.cls} filas`);
    console.log(`  ctas_contables: ${t.cta} filas`);
    console.log(`  activos:        ${t.act} filas`);

  } catch (err) {
    await pgClient.query('ROLLBACK');
    throw err;
  } finally {
    pgClient.release();
    await pgPool.end();
  }
}

migrate().catch(err => {
  console.error('\nERROR FATAL:', err.message);
  process.exit(1);
});
