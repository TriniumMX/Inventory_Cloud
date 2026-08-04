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

  console.log('[1/2] Leyendo CONSIGNAS...');
  const consRows = (await sqlPool.request().query('SELECT * FROM [CONSIGNAS]')).recordset;
  console.log(`  Filas: ${consRows.length}`);

  console.log('[2/2] Leyendo RESGUARDOS...');
  const resRows = (await sqlPool.request().query('SELECT * FROM [RESGUARDOS]')).recordset;
  console.log(`  Filas: ${resRows.length}`);

  await sql.close();

  const pgClient = await pgPool.connect();
  try {
    // Ampliar nomina antes de insertar
    console.log('\nAlterando resguardos.nomina → VARCHAR(60)...');
    await pgClient.query(`ALTER TABLE resguardos ALTER COLUMN nomina TYPE VARCHAR(60)`);
    console.log('OK');

    await pgClient.query('BEGIN');

    // CONSIGNAS
    console.log('\nMigrando consignas...');
    await migrateTable(pgClient, 'consignas', consRows, async (c, row) => {
      await c.query(
        `INSERT INTO consignas (id_consigna, consigna, estatus)
         VALUES ($1, $2, 1)
         ON CONFLICT (id_consigna) DO NOTHING`,
        [row.id_consigna, row.consigna]
      );
    });

    // RESGUARDOS
    console.log('Migrando resguardos...');
    await migrateTable(pgClient, 'resguardos', resRows, async (c, row) => {
      await c.query(
        `INSERT INTO resguardos (id_resguardo, folio, nomina, numero_inventario, fecha, estatus, id_usuario)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id_resguardo) DO NOTHING`,
        [
          row.id_resguardo,
          null,
          row.nomina ?? null,
          row.numero_inventario,
          row.fecha ?? null,
          row.estatus ?? true,
          row.id_usuario ?? null,
        ]
      );
    });

    // Reset sequence resguardos
    await pgClient.query(`SELECT setval('resguardos_id_resguardo_seq', (SELECT MAX(id_resguardo) FROM resguardos))`);

    await pgClient.query('COMMIT');
    console.log('\nMigración completa.');

    const totals = await pgClient.query(`
      SELECT
        (SELECT COUNT(*) FROM consignas)  AS cons,
        (SELECT COUNT(*) FROM resguardos) AS res
    `);
    const t = totals.rows[0];
    console.log(`\nVerificación Postgres:`);
    console.log(`  consignas:  ${t.cons} filas`);
    console.log(`  resguardos: ${t.res} filas`);

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
