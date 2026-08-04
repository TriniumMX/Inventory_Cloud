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

async function migrate() {
  console.log('Conectando a SQL Server...');
  const sqlPool = await sql.connect(sqlConfig);

  console.log('Leyendo [ACTIVOS] donde tipo = 1 o 2...');
  const result = await sqlPool.request().query(
    'SELECT * FROM [ACTIVOS] WHERE tipo = 1 OR tipo = 2'
  );

  const rows = result.recordset;
  console.log(`Filas encontradas: ${rows.length}`);

  if (rows.length === 0) {
    console.log('Sin datos. Fin.');
    return;
  }

  // Mostrar columnas disponibles en origen
  console.log('Columnas origen:', Object.keys(rows[0]).join(', '));

  const pgClient = await pgPool.connect();
  try {
    await pgClient.query('BEGIN');
    // Deshabilitar FK checks temporalmente para migración limpia
    await pgClient.query('SET CONSTRAINTS ALL DEFERRED');

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const r = {};
      for (const k of Object.keys(row)) {
        r[k.toLowerCase()] = row[k];
      }

      const numero_inventario = r['numero_inventario'] ?? r['numinventario'] ?? r['num_inventario'] ?? null;
      const descripcion       = r['descripcion'] ?? r['description'] ?? null;
      const marca             = r['marca'] ?? null;
      const modelo            = r['modelo'] ?? null;
      const numero_serie      = r['numero_serie'] ?? r['numeroserie'] ?? r['num_serie'] ?? r['serie'] ?? null;
      // FK refs: poner NULL si catalogo no existe en destino
      const clasificacion     = r['clasificacion'] ?? r['id_clasificacion'] ?? null;
      const id_cta_contable   = r['id_cta_contable'] ?? r['idctacontable'] ?? r['cta_contable'] ?? null;
      const costo             = r['costo'] ?? r['valor'] ?? null;
      const f_alta            = r['f_alta'] ?? r['fecha_alta'] ?? r['fechaalta'] ?? null;
      const f_factura         = r['f_factura'] ?? r['fecha_factura'] ?? r['fechafactura'] ?? null;
      const folio_factura     = r['folio_factura'] ?? r['foliofactura'] ?? r['folio'] ?? null;
      const estatus           = r['estatus'] ?? 1;
      const tipo              = r['tipo'] ?? null;
      const ultimo_nomina     = r['ultimo_nomina'] ?? r['ultimonomina'] ?? r['nomina'] ?? null;
      const observaciones     = r['observaciones'] ?? r['observacion'] ?? null;

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
            numero_inventario, descripcion, marca, modelo, numero_serie,
            clasificacion, id_cta_contable, costo,
            f_alta, f_factura, folio_factura,
            estatus, tipo, ultimo_nomina, observaciones,
          ]
        );
        await pgClient.query('RELEASE SAVEPOINT sp');
        inserted++;
      } catch (err) {
        await pgClient.query('ROLLBACK TO SAVEPOINT sp');
        // Reintentar con FK refs en NULL
        try {
          await pgClient.query(
            `INSERT INTO activos
              (numero_inventario, descripcion, marca, modelo, numero_serie,
               clasificacion, id_cta_contable, costo, f_alta, f_factura,
               folio_factura, estatus, tipo, ultimo_nomina, observaciones)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             ON CONFLICT DO NOTHING`,
            [
              numero_inventario, descripcion, marca, modelo, numero_serie,
              null, null, costo,
              f_alta, f_factura, folio_factura,
              estatus, tipo, ultimo_nomina, observaciones,
            ]
          );
          inserted++;
          console.warn(`FK ignorada num_inv=${numero_inventario}: clasificacion/cta set NULL`);
        } catch (err2) {
          console.warn(`Skip fila num_inv=${numero_inventario}: ${err2.message}`);
          skipped++;
        }
      }
    }

    await pgClient.query('COMMIT');
    console.log(`Migración completa. Insertados: ${inserted}, Saltados: ${skipped}`);
  } catch (err) {
    await pgClient.query('ROLLBACK');
    throw err;
  } finally {
    pgClient.release();
    await pgPool.end();
    await sql.close();
  }
}

migrate().catch(err => {
  console.error('Error migración:', err.message);
  process.exit(1);
});
