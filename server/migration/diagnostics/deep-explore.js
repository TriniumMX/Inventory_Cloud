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
  connectionTimeout: 30000,
  requestTimeout: 120000,
};

async function main() {
  const pool = await sql.connect(sqlConfig);

  // 1. Todas las tablas con conteo de filas
  const tables = (await pool.request().query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`
  )).recordset.map(r => r.TABLE_NAME);

  console.log('\n############ TABLAS (' + tables.length + ') ############');
  for (const t of tables) {
    let n = '?';
    try { n = (await pool.request().query(`SELECT COUNT(*) c FROM [${t}]`)).recordset[0].c; } catch (e) {}
    console.log(`  ${t.padEnd(30)} ${n} filas`);
  }

  // 2. Esquema completo de cada tabla
  for (const t of tables) {
    const cols = (await pool.request().query(
      `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${t}' ORDER BY ORDINAL_POSITION`
    )).recordset;

    // PKs
    const pks = (await pool.request().query(
      `SELECT KU.COLUMN_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS TC
       JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KU ON TC.CONSTRAINT_NAME=KU.CONSTRAINT_NAME
       WHERE TC.CONSTRAINT_TYPE='PRIMARY KEY' AND TC.TABLE_NAME='${t}'`
    )).recordset.map(r => r.COLUMN_NAME);

    console.log(`\n==================== [${t}] ====================`);
    console.log(`  PK: ${pks.join(', ') || '(ninguna)'}`);
    for (const c of cols) {
      let type = c.DATA_TYPE;
      if (c.CHARACTER_MAXIMUM_LENGTH) type += `(${c.CHARACTER_MAXIMUM_LENGTH})`;
      else if (c.NUMERIC_PRECISION && (c.DATA_TYPE === 'decimal' || c.DATA_TYPE === 'numeric')) type += `(${c.NUMERIC_PRECISION},${c.NUMERIC_SCALE})`;
      const flags = [c.IS_NULLABLE === 'NO' ? 'NOT NULL' : '', c.COLUMN_DEFAULT ? `DEF ${c.COLUMN_DEFAULT}` : '', pks.includes(c.COLUMN_NAME) ? 'PK' : ''].filter(Boolean).join(' ');
      console.log(`    ${c.COLUMN_NAME.padEnd(28)} ${type.padEnd(18)} ${flags}`);
    }
  }

  // 3. Foreign keys globales
  console.log('\n############ FOREIGN KEYS ############');
  const fks = (await pool.request().query(
    `SELECT fk.name AS fk, OBJECT_NAME(fk.parent_object_id) AS tabla,
            c1.name AS col, OBJECT_NAME(fk.referenced_object_id) AS ref_tabla, c2.name AS ref_col
     FROM sys.foreign_keys fk
     JOIN sys.foreign_key_columns fkc ON fk.object_id=fkc.constraint_object_id
     JOIN sys.columns c1 ON fkc.parent_object_id=c1.object_id AND fkc.parent_column_id=c1.column_id
     JOIN sys.columns c2 ON fkc.referenced_object_id=c2.object_id AND fkc.referenced_column_id=c2.column_id
     ORDER BY tabla`
  )).recordset;
  if (fks.length === 0) console.log('  (ninguna FK declarada)');
  fks.forEach(f => console.log(`  ${f.tabla}.${f.col} -> ${f.ref_tabla}.${f.ref_col}`));

  await sql.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
