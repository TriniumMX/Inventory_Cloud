require('dotenv').config();
const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');

const PG_BIN = 'C:\\Program Files\\PostgreSQL\\17\\bin';
const HOST = 'sanjuandelrio.sytes.net';
const PORT = '5432';
const USER = 'postgres';
const PASS = 'AdminSJR@2025';
const SOURCE_DB = 'inventory';
const TARGET_DB = 'inventory_QA';
const DUMP_FILE = path.join(__dirname, 'inventory_dump.sql');

const env = { ...process.env, PGPASSWORD: PASS };

async function run() {
  // 1. Crear la base de datos destino (conectando a inventory)
  console.log(`Creando base de datos "${TARGET_DB}"...`);
  const client = new Client({ user: USER, password: PASS, host: HOST, port: parseInt(PORT), database: SOURCE_DB });
  await client.connect();

  const exists = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [TARGET_DB]);
  if (exists.rows.length > 0) {
    console.log(`  "${TARGET_DB}" ya existe, eliminando...`);
    await client.query(`DROP DATABASE "${TARGET_DB}"`);
  }
  await client.query(`CREATE DATABASE "${TARGET_DB}"`);
  await client.end();
  console.log(`  "${TARGET_DB}" creada.`);

  // 2. Dump de inventory
  console.log(`\nDump de "${SOURCE_DB}"...`);
  execSync(
    `"${PG_BIN}\\pg_dump" -h ${HOST} -p ${PORT} -U ${USER} -d ${SOURCE_DB} -f "${DUMP_FILE}" --no-owner --no-acl`,
    { env, stdio: 'inherit' }
  );
  console.log(`  Dump guardado en ${DUMP_FILE}`);

  // 3. Restore en inventory_QA
  console.log(`\nRestaurando en "${TARGET_DB}"...`);
  execSync(
    `"${PG_BIN}\\psql" -h ${HOST} -p ${PORT} -U ${USER} -d "${TARGET_DB}" -f "${DUMP_FILE}"`,
    { env, stdio: 'pipe' }
  );
  console.log(`  Restauración completa.`);

  // 4. Verificar
  const qa = new Client({ user: USER, password: PASS, host: HOST, port: parseInt(PORT), database: TARGET_DB });
  await qa.connect();
  const totals = await qa.query(`
    SELECT
      (SELECT COUNT(*) FROM activos) AS activos,
      (SELECT COUNT(*) FROM clasificacion) AS clasificacion,
      (SELECT COUNT(*) FROM resguardos) AS resguardos,
      (SELECT COUNT(*) FROM consignas) AS consignas
  `);
  console.log(`\nVerificación "${TARGET_DB}":`);
  const t = totals.rows[0];
  console.log(`  activos:        ${t.activos}`);
  console.log(`  clasificacion:  ${t.clasificacion}`);
  console.log(`  resguardos:     ${t.resguardos}`);
  console.log(`  consignas:      ${t.consignas}`);
  await qa.end();

  // Limpiar dump file
  require('fs').unlinkSync(DUMP_FILE);
  console.log('\nDone. Dump temporal eliminado.');
}

run().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
