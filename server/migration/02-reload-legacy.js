// Fase 2 — Recarga de tablas legacy en inventory_QA preservando IDs originales.
//  Catálogos (clasificacion, ctas_contables, consignas, usuarios): UPSERT desde origen
//    (no se borran para no romper FK de bienes_inmuebles que sobrevive).
//  activos (solo tipo 1 y 2): DELETE + reinserción preservando id_consecutivo.
//  resguardos: DELETE + reinserción preservando id_resguardo.
//  Limpieza: RTRIM de nchar, money->numeric, datetime->ts, estatus NULL->1,
//            FK clasificacion/cta inválida -> NULL.
const { pgPool, mssqlConnect, sql, log, cleanStr, toNumeric, toInt, toDate, toBool } = require('./lib');

const BATCH = 500;

// Inserta filas en lotes; si un lote falla (p.ej. conflicto único), reintenta fila por fila.
async function batchInsert(c, table, cols, rows, { onConflict = '' } = {}) {
  let ok = 0; const conflicts = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const values = [];
    const params = [];
    let p = 1;
    for (const r of slice) {
      values.push('(' + cols.map(() => `$${p++}`).join(',') + ')');
      params.push(...cols.map(col => r[col]));
    }
    const q = `INSERT INTO ${table} (${cols.join(',')}) VALUES ${values.join(',')} ${onConflict}`;
    await c.query('SAVEPOINT b');
    try {
      const res = await c.query(q, params);
      await c.query('RELEASE SAVEPOINT b');
      ok += res.rowCount;
    } catch (e) {
      await c.query('ROLLBACK TO SAVEPOINT b');
      // fila por fila
      for (const r of slice) {
        await c.query('SAVEPOINT r');
        try {
          const res = await c.query(
            `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map((_, k) => `$${k + 1}`).join(',')}) ${onConflict}`,
            cols.map(col => r[col])
          );
          await c.query('RELEASE SAVEPOINT r');
          ok += res.rowCount;
        } catch (e2) {
          await c.query('ROLLBACK TO SAVEPOINT r');
          conflicts.push({ row: r, error: e2.message.split('\n')[0] });
        }
      }
    }
  }
  return { ok, conflicts };
}

async function main() {
  log('Leyendo origen SQL Server...');
  const sp = await mssqlConnect();
  const Q = async q => (await sp.request().query(q)).recordset;

  const clsRows = await Q('SELECT id_clasificacion, clasificacion FROM CLASIFICACION');
  const ctaRows = await Q('SELECT id_ctacontable, cta_contable, descripcion, id_clasificacion_cta FROM CTAS_CONTABLES');
  const consRows = await Q('SELECT id_consigna, consigna FROM CONSIGNAS');
  const usrRows = await Q('SELECT id_usuario, nombre, usuario, password, administrador, permisos FROM USUARIOS');
  const actRows = await Q('SELECT * FROM ACTIVOS WHERE tipo = 1 OR tipo = 2 ORDER BY id_consecutivo');
  const resRows = await Q('SELECT id_resguardo, numero_inventario, nomina, estatus, id_usuario, fecha FROM RESGUARDOS ORDER BY id_resguardo');
  await sql.close();
  log(`Origen: clasif=${clsRows.length} ctas=${ctaRows.length} consig=${consRows.length} usr=${usrRows.length} activos(1,2)=${actRows.length} resg=${resRows.length}`);

  const pg = pgPool();
  const c = await pg.connect();
  try {
    await c.query('BEGIN');

    // ── Catálogos (UPSERT) ────────────────────────────────────────
    log('UPSERT clasificacion...');
    for (const r of clsRows) {
      await c.query(
        `INSERT INTO clasificacion (id_clasificacion, clasificacion, estatus) VALUES ($1,$2,1)
         ON CONFLICT (id_clasificacion) DO UPDATE SET clasificacion = EXCLUDED.clasificacion`,
        [r.id_clasificacion, cleanStr(r.clasificacion, 200)]
      );
    }
    log('UPSERT ctas_contables...');
    for (const r of ctaRows) {
      await c.query(
        `INSERT INTO ctas_contables (id_ctacontable, cta_contable, descripcion, id_clasificacion_cta, estatus) VALUES ($1,$2,$3,$4,1)
         ON CONFLICT (id_ctacontable) DO UPDATE SET cta_contable=EXCLUDED.cta_contable, descripcion=EXCLUDED.descripcion, id_clasificacion_cta=EXCLUDED.id_clasificacion_cta`,
        [r.id_ctacontable, cleanStr(r.cta_contable, 50), cleanStr(r.descripcion), toInt(r.id_clasificacion_cta)]
      );
    }
    log('UPSERT consignas...');
    for (const r of consRows) {
      await c.query(
        `INSERT INTO consignas (id_consigna, consigna, estatus) VALUES ($1,$2,1)
         ON CONFLICT (id_consigna) DO UPDATE SET consigna = EXCLUDED.consigna`,
        [r.id_consigna, cleanStr(r.consigna, 300)]
      );
    }
    log('UPSERT usuarios...');
    for (const r of usrRows) {
      await c.query(
        `INSERT INTO usuarios (id_usuario, nombre, usuario, password, administrador, permisos) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id_usuario) DO UPDATE SET nombre=EXCLUDED.nombre, usuario=EXCLUDED.usuario, administrador=EXCLUDED.administrador, permisos=EXCLUDED.permisos`,
        [r.id_usuario, cleanStr(r.nombre, 200), cleanStr(r.usuario, 100), cleanStr(r.password), toBool(r.administrador, false), toInt(r.permisos)]
      );
    }

    // Conjuntos válidos para FK
    const validCls = new Set((await c.query('SELECT id_clasificacion FROM clasificacion')).rows.map(x => x.id_clasificacion));
    const validCta = new Set((await c.query('SELECT id_ctacontable FROM ctas_contables')).rows.map(x => x.id_ctacontable));

    // ── activos: DELETE + reinserción ─────────────────────────────
    log('DELETE activos + reinsertando tipo 1 y 2...');
    await c.query('DELETE FROM activos');
    const actCols = ['id_consecutivo','numero_inventario','descripcion','marca','modelo','numero_serie','clasificacion','id_cta_contable','costo','f_alta','f_factura','folio_factura','estatus','tipo','ultimo_nomina','observaciones'];
    const actMapped = actRows.map(row => {
      const r = {}; for (const k of Object.keys(row)) r[k.toLowerCase()] = row[k];
      const cls = toInt(r.clasificacion); const cta = toInt(r.id_cta_contable);
      return {
        id_consecutivo: toInt(r.id_consecutivo),
        numero_inventario: cleanStr(r.numero_inventario, 50),
        descripcion: cleanStr(r.descripcion),
        marca: cleanStr(r.marca, 100),
        modelo: cleanStr(r.modelo, 100),
        numero_serie: cleanStr(r.numero_serie, 100),
        clasificacion: validCls.has(cls) ? cls : null,
        id_cta_contable: validCta.has(cta) ? cta : null,
        costo: toNumeric(r.costo),
        f_alta: toDate(r.f_alta),
        f_factura: toDate(r.f_factura),
        folio_factura: cleanStr(r.folio_factura, 100),
        estatus: r.estatus == null ? 1 : toInt(r.estatus),  // NULL -> 1 (decisión)
        tipo: toInt(r.tipo),
        ultimo_nomina: cleanStr(r.ultimo_nomina, 100),
        observaciones: cleanStr(r.observaciones),
      };
    });
    const actRes = await batchInsert(c, 'activos', actCols, actMapped, { onConflict: 'ON CONFLICT DO NOTHING' });
    log(`  activos insertados: ${actRes.ok} | conflictos: ${actRes.conflicts.length}`);
    actRes.conflicts.forEach(x => log(`    [CONFLICTO] num_inv=${x.row.numero_inventario} id=${x.row.id_consecutivo}: ${x.error}`));
    await c.query(`SELECT setval('activos_id_consecutivo_seq', (SELECT GREATEST(MAX(id_consecutivo),1) FROM activos))`);

    // ── resguardos: DELETE + reinserción ──────────────────────────
    log('DELETE resguardos + reinsertando...');
    await c.query('DELETE FROM resguardos');
    const resCols = ['id_resguardo','folio','nomina','numero_inventario','fecha','estatus','id_usuario'];
    const resMapped = resRows.map(r => ({
      id_resguardo: toInt(r.id_resguardo),
      folio: null,
      nomina: cleanStr(r.nomina, 60),
      numero_inventario: cleanStr(r.numero_inventario, 50),
      fecha: toDate(r.fecha),
      estatus: toBool(r.estatus, true),
      id_usuario: toInt(r.id_usuario),
    }));
    const resRes = await batchInsert(c, 'resguardos', resCols, resMapped, { onConflict: 'ON CONFLICT (id_resguardo) DO NOTHING' });
    log(`  resguardos insertados: ${resRes.ok} | conflictos: ${resRes.conflicts.length}`);
    resRes.conflicts.forEach(x => log(`    [CONFLICTO] id=${x.row.id_resguardo}: ${x.error}`));
    await c.query(`SELECT setval('resguardos_id_resguardo_seq', (SELECT GREATEST(MAX(id_resguardo),1) FROM resguardos))`);

    // setval secuencias catálogos
    await c.query(`SELECT setval('clasificacion_id_clasificacion_seq', (SELECT GREATEST(MAX(id_clasificacion),1) FROM clasificacion))`);
    await c.query(`SELECT setval('usuarios_id_usuario_seq', (SELECT GREATEST(MAX(id_usuario),1) FROM usuarios))`);

    // Agregar FK activos.tipo -> tipos (ahora solo hay 1 y 2)
    log('Agregando FK activos.tipo -> tipos...');
    await c.query(`ALTER TABLE activos DROP CONSTRAINT IF EXISTS fk_activos_tipo`);
    await c.query(`ALTER TABLE activos ADD CONSTRAINT fk_activos_tipo FOREIGN KEY (tipo) REFERENCES tipos(id_tipo)`);

    await c.query('COMMIT');
    log('Fase 2 completa (COMMIT).');
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('ERROR Fase 2 (ROLLBACK):', e.message);
    process.exit(1);
  } finally {
    c.release();
    await pg.end();
  }
}

main();
