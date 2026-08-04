require('dotenv').config();
const sql = require('mssql');
const { Pool } = require('pg');

const sqlConfig = {
  user: process.env.DB_USER?.trim(),
  password: process.env.DB_PASSWORD?.trim(),
  server: process.env.DB_SERVER?.trim(),
  database: process.env.DB_DATABASE?.trim(),
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 30000, requestTimeout: 120000,
};
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const s = await sql.connect(sqlConfig);
  const q = async (query) => (await s.request().query(query)).recordset;

  console.log('\n===== SQL SERVER (ACTIVO) =====');

  console.log('\n-- ACTIVOS por tipo --');
  console.table(await q(`SELECT tipo, COUNT(*) c FROM ACTIVOS GROUP BY tipo ORDER BY tipo`));

  console.log('-- ACTIVOS por estatus --');
  console.table(await q(`SELECT estatus, COUNT(*) c FROM ACTIVOS GROUP BY estatus ORDER BY estatus`));

  console.log('-- TIPOS (catálogo) --');
  console.table(await q(`SELECT * FROM TIPOS`));

  console.log('-- ACTIVOS: nulos y duplicados de numero_inventario --');
  console.table(await q(`
    SELECT
      (SELECT COUNT(*) FROM ACTIVOS WHERE numero_inventario IS NULL OR LTRIM(RTRIM(numero_inventario))='') AS num_inv_nulos,
      (SELECT COUNT(*) FROM (SELECT numero_inventario FROM ACTIVOS WHERE numero_inventario IS NOT NULL GROUP BY numero_inventario HAVING COUNT(*)>1) z) AS num_inv_dups,
      (SELECT MAX(LEN(ultimo_nomina)) FROM ACTIVOS) AS max_len_nomina,
      (SELECT MAX(LEN(numero_serie)) FROM ACTIVOS) AS max_len_serie,
      (SELECT MAX(id_consecutivo) FROM ACTIVOS) AS max_id_consec`));

  console.log('-- RESGUARDOS: estatus y huérfanos --');
  console.table(await q(`
    SELECT
      (SELECT COUNT(*) FROM RESGUARDOS WHERE estatus=1) AS activos_t,
      (SELECT COUNT(*) FROM RESGUARDOS WHERE estatus=0) AS inactivos_f,
      (SELECT MAX(id_resguardo) FROM RESGUARDOS) AS max_id,
      (SELECT COUNT(DISTINCT numero_inventario) FROM RESGUARDOS) AS distinct_num_inv,
      (SELECT COUNT(*) FROM RESGUARDOS r WHERE NOT EXISTS (SELECT 1 FROM ACTIVOS a WHERE a.numero_inventario=r.numero_inventario)) AS sin_activo`));

  console.log('-- USUARIOS --');
  console.table(await q(`SELECT id_usuario, nombre, usuario, administrador, permisos, CASE WHEN password_hash IS NULL THEN 0 ELSE 1 END AS tiene_hash FROM USUARIOS`));

  await sql.close();

  console.log('\n===== POSTGRES (inventory_QA) =====');
  const counts = await pg.query(`
    SELECT 'activos' t, COUNT(*) n FROM activos
    UNION ALL SELECT 'clasificacion', COUNT(*) FROM clasificacion
    UNION ALL SELECT 'ctas_contables', COUNT(*) FROM ctas_contables
    UNION ALL SELECT 'consignas', COUNT(*) FROM consignas
    UNION ALL SELECT 'resguardos', COUNT(*) FROM resguardos
    UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
    ORDER BY t`);
  console.table(counts.rows);

  console.log('-- PG activos por tipo --');
  console.table((await pg.query(`SELECT tipo, COUNT(*) n FROM activos GROUP BY tipo ORDER BY tipo`)).rows);
  console.log('-- PG activos por estatus --');
  console.table((await pg.query(`SELECT estatus, COUNT(*) n FROM activos GROUP BY estatus ORDER BY estatus`)).rows);

  // ¿existe tabla tipos_activo en PG? ¿columna administrador en usuarios?
  console.log('-- PG: columnas usuarios --');
  console.table((await pg.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='usuarios' ORDER BY ordinal_position`)).rows);

  await pg.end();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
