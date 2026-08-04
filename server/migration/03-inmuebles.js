// Fase 3 — ⚠️ DESACTIVADO POR DECISIÓN (2026-06-10): NO migrar INMUEBLES.
//  Los ACTIVOS tipo=3 quedan SOLO en el sistema viejo; no se cargan en bienes_inmuebles.
//  Se conserva el script por referencia. NO ejecutar como parte de la migración.
//  ---- (lógica original abajo) ----
//  ACTIVOS tipo=3 (INMUEBLES) -> bienes_inmuebles (top-up, no destructivo).
//  descripcion (contiene la ubicación real) -> direccion + nombre.
//  Conserva clasificacion y numero_serie originales en observaciones.
//  No toca la(s) fila(s) existente(s): ON CONFLICT (numero_inventario) DO NOTHING.
console.error('Fase 3 (INMUEBLES) está DESACTIVADA por decisión. No se ejecuta.');
process.exit(0);
const { pgPool, mssqlConnect, sql, log, cleanStr, cleanMultiline, toNumeric, toInt, toDate } = require('./lib');

async function main() {
  log('Leyendo ACTIVOS tipo=3 (INMUEBLES)...');
  const sp = await mssqlConnect();
  const rows = (await sp.request().query('SELECT * FROM ACTIVOS WHERE tipo = 3 ORDER BY id_consecutivo')).recordset;
  await sql.close();
  log(`  Origen tipo=3: ${rows.length} filas`);

  const pg = pgPool();
  const c = await pg.connect();
  try {
    await c.query('BEGIN');
    const validCta = new Set((await c.query('SELECT id_ctacontable FROM ctas_contables')).rows.map(x => x.id_ctacontable));

    let ok = 0, skip = 0; const errs = [];
    for (const row of rows) {
      const r = {}; for (const k of Object.keys(row)) r[k.toLowerCase()] = row[k];

      const numInv = cleanStr(r.numero_inventario, 50);
      const direccion = cleanMultiline(r.descripcion) || 'SIN DIRECCION REGISTRADA';
      const nombre = cleanMultiline(r.descripcion, 200);
      const cta = toInt(r.id_cta_contable);
      const serie = cleanStr(r.numero_serie, 100);
      const obsParts = [];
      if (r.clasificacion != null) obsParts.push(`clasif_origen=${toInt(r.clasificacion)}`);
      if (serie) obsParts.push(`serie=${serie}`);
      const extra = cleanStr(r.observaciones);
      if (extra) obsParts.push(extra);
      obsParts.push(`migrado_de_activos id_consecutivo=${toInt(r.id_consecutivo)}`);

      await c.query('SAVEPOINT s');
      try {
        const res = await c.query(
          `INSERT INTO bienes_inmuebles
             (numero_inventario, nombre, descripcion, direccion, costo_adquisicion,
              fecha_adquisicion, id_cta_contable, responsable_nomina, estatus, observaciones)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (numero_inventario) DO NOTHING`,
          [
            numInv,
            nombre,
            nombre,                                  // descripcion = misma ubicación
            direccion,
            toNumeric(r.costo),
            toDate(r.f_factura),
            validCta.has(cta) ? cta : null,
            cleanStr(r.ultimo_nomina, 20),
            r.estatus == null ? 1 : toInt(r.estatus),
            obsParts.join(' | '),
          ]
        );
        await c.query('RELEASE SAVEPOINT s');
        if (res.rowCount > 0) ok++; else skip++;
      } catch (e) {
        await c.query('ROLLBACK TO SAVEPOINT s');
        errs.push({ numInv, error: e.message.split('\n')[0] });
      }
    }

    await c.query('COMMIT');
    log(`Fase 3 completa. Insertados: ${ok} | omitidos(conflicto num_inv): ${skip} | errores: ${errs.length}`);
    errs.slice(0, 10).forEach(e => log(`  [ERROR] ${e.numInv}: ${e.error}`));
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('ERROR Fase 3 (ROLLBACK):', e.message);
    process.exit(1);
  } finally {
    c.release();
    await pg.end();
  }
}

main();
