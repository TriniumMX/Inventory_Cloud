require('dotenv').config();
const sql = require('mssql');

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

async function explore() {
  const pool = await sql.connect(sqlConfig);

  // Todas las tablas
  const tables = await pool.request().query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`
  );
  console.log('=== TABLAS EN SQL SERVER ===');
  tables.recordset.forEach(r => console.log(' -', r.TABLE_NAME));

  // Columnas de CLASIFICACION si existe
  const clsExists = tables.recordset.find(r => r.TABLE_NAME.toUpperCase().includes('CLASIFICACION'));
  if (clsExists) {
    const cols = await pool.request().query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${clsExists.TABLE_NAME}'`
    );
    console.log(`\n=== COLUMNAS [${clsExists.TABLE_NAME}] ===`);
    cols.recordset.forEach(c => console.log(` ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    const count = await pool.request().query(`SELECT COUNT(*) as total FROM [${clsExists.TABLE_NAME}]`);
    console.log(` Total filas: ${count.recordset[0].total}`);
  }

  // Columnas de CTAS_CONTABLES si existe
  const ctaExists = tables.recordset.find(r => r.TABLE_NAME.toUpperCase().includes('CTA'));
  if (ctaExists) {
    const cols = await pool.request().query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${ctaExists.TABLE_NAME}'`
    );
    console.log(`\n=== COLUMNAS [${ctaExists.TABLE_NAME}] ===`);
    cols.recordset.forEach(c => console.log(` ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    const count = await pool.request().query(`SELECT COUNT(*) as total FROM [${ctaExists.TABLE_NAME}]`);
    console.log(` Total filas: ${count.recordset[0].total}`);
  }

  await sql.close();
}

explore().catch(err => { console.error(err.message); process.exit(1); });
