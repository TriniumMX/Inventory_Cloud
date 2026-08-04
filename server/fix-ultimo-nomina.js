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

async function fix() {
  const pgClient = await pgPool.connect();

  // 1. Ampliar columna
  console.log('Alterando columna ultimo_nomina → VARCHAR(100)...');
  await pgClient.query(`ALTER TABLE activos ALTER COLUMN ultimo_nomina TYPE VARCHAR(100)`);
  console.log('OK');

  // 2. Leer solo las filas con ultimo_nomina > 30 chars desde SQL Server
  console.log('\nConectando SQL Server...');
  const sqlPool = await sql.connect(sqlConfig);
  const result = await sqlPool.request().query(
    `SELECT * FROM [ACTIVOS] WHERE (tipo = 1 OR tipo = 2) AND LEN(ultimo_nomina) > 30`
  );
  const rows = result.recordset;
  console.log(`Filas a reinsertar: ${rows.length}`);
  await sql.close();

  // 3. Reinsertar
  let ok = 0, skip = 0;
  await pgClient.query('BEGIN');
  for (const row of rows) {
    const r = {};
    for (const k of Object.keys(row)) r[k.toLowerCase()] = row[k];

    await pgClient.query('SAVEPOINT sp');
    try {
      await pgClient.query(
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
      await pgClient.query('RELEASE SAVEPOINT sp');
      ok++;
    } catch (err) {
      await pgClient.query('ROLLBACK TO SAVEPOINT sp');
      console.warn(`  [SKIP] num_inv=${r['numero_inventario']}: ${err.message.split('\n')[0]}`);
      skip++;
    }
  }
  await pgClient.query('COMMIT');

  console.log(`\nReinserción: ${ok} insertados, ${skip} saltados`);

  // Verificación final
  const total = await pgClient.query(`SELECT COUNT(*) as total FROM activos`);
  console.log(`Total activos en Postgres: ${total.rows[0].total}`);

  pgClient.release();
  await pgPool.end();
}

fix().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
