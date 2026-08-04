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

  for (const table of ['CONSIGNAS', 'RESGUARDOS']) {
    const cols = await pool.request().query(
      `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${table}'`
    );
    console.log(`\n=== COLUMNAS [${table}] ===`);
    cols.recordset.forEach(c => console.log(` ${c.COLUMN_NAME} (${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? '('+c.CHARACTER_MAXIMUM_LENGTH+')' : ''})`));

    const count = await pool.request().query(`SELECT COUNT(*) as total FROM [${table}]`);
    console.log(` Total filas: ${count.recordset[0].total}`);

    const sample = await pool.request().query(`SELECT TOP 5 * FROM [${table}]`);
    console.log(' Muestra:');
    console.table(sample.recordset);
  }

  await sql.close();
}

explore().catch(err => { console.error(err.message); process.exit(1); });
