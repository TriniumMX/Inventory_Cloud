// Fase 4 — Verificación: compara conteos origen vs destino y revisa integridad.
const { pgPool, mssqlConnect, sql, log } = require('./lib');

async function main() {
  const sp = await mssqlConnect();
  const SQ = async q => (await sp.request().query(q)).recordset[0];

  const src = {
    clasificacion: (await SQ('SELECT COUNT(*) n FROM CLASIFICACION')).n,
    ctas_contables: (await SQ('SELECT COUNT(*) n FROM CTAS_CONTABLES')).n,
    consignas: (await SQ('SELECT COUNT(*) n FROM CONSIGNAS')).n,
    usuarios: (await SQ('SELECT COUNT(*) n FROM USUARIOS')).n,
    tipos: (await SQ('SELECT COUNT(*) n FROM TIPOS')).n,
    activos_t12: (await SQ('SELECT COUNT(*) n FROM ACTIVOS WHERE tipo IN (1,2)')).n,
    activos_t3: (await SQ('SELECT COUNT(*) n FROM ACTIVOS WHERE tipo = 3')).n,
    resguardos: (await SQ('SELECT COUNT(*) n FROM RESGUARDOS')).n,
  };
  await sql.close();

  const pg = pgPool();
  const P = async q => parseInt((await pg.query(q)).rows[0].n, 10);
  const dst = {
    clasificacion: await P('SELECT COUNT(*) n FROM clasificacion'),
    ctas_contables: await P('SELECT COUNT(*) n FROM ctas_contables'),
    consignas: await P('SELECT COUNT(*) n FROM consignas'),
    usuarios: await P('SELECT COUNT(*) n FROM usuarios'),
    tipos: await P('SELECT COUNT(*) n FROM tipos'),
    activos_t12: await P('SELECT COUNT(*) n FROM activos WHERE tipo IN (1,2)'),
    inmuebles_migrados: await P("SELECT COUNT(*) n FROM bienes_inmuebles WHERE observaciones LIKE '%migrado_de_activos%'"),
    resguardos: await P('SELECT COUNT(*) n FROM resguardos'),
  };

  console.log('\n================ VERIFICACIÓN origen vs destino ================');
  const rows = [
    ['clasificacion', src.clasificacion, dst.clasificacion],
    ['ctas_contables', src.ctas_contables, dst.ctas_contables],
    ['consignas', src.consignas, dst.consignas],
    ['usuarios', src.usuarios, dst.usuarios],
    ['tipos', src.tipos, dst.tipos],
    ['activos (tipo 1,2)', src.activos_t12, dst.activos_t12],
    ['resguardos', src.resguardos, dst.resguardos],
  ].map(([t, s, d]) => ({ tabla: t, origen: s, destino: d, match: s === d ? 'OK' : `DIF ${d - s}` }));
  console.table(rows);

  // INMUEBLES (tipo=3): EXCLUIDOS de la migración por decisión. Solo informativo.
  console.log(`INMUEBLES tipo=3 en origen: ${src.activos_t3} (NO migrados, por decisión). Migrados en destino: ${dst.inmuebles_migrados}`);

  console.log('\n---- Integridad ----');
  const orphCls = await P(`SELECT COUNT(*) n FROM activos WHERE clasificacion IS NOT NULL AND clasificacion NOT IN (SELECT id_clasificacion FROM clasificacion)`);
  const orphCta = await P(`SELECT COUNT(*) n FROM activos WHERE id_cta_contable IS NOT NULL AND id_cta_contable NOT IN (SELECT id_ctacontable FROM ctas_contables)`);
  const dupActive = await P(`SELECT COUNT(*) n FROM (SELECT numero_inventario FROM activos WHERE numero_inventario IS NOT NULL AND estatus<>0 GROUP BY numero_inventario HAVING COUNT(*)>1) z`);
  const nullDir = await P(`SELECT COUNT(*) n FROM bienes_inmuebles WHERE direccion IS NULL`);
  log(`activos con clasificacion huérfana: ${orphCls}`);
  log(`activos con cta_contable huérfana: ${orphCta}`);
  log(`activos num_inventario duplicado (no-baja): ${dupActive}`);
  log(`bienes_inmuebles con direccion NULL: ${nullDir}`);

  const allMatch = rows.every(r => r.match === 'OK') && orphCls === 0 && orphCta === 0 && dupActive === 0 && nullDir === 0
    && dst.inmuebles_migrados === 0;
  console.log(`\n${allMatch ? '✅ MIGRACIÓN VERIFICADA — todo coincide.' : '⚠️  Revisar diferencias arriba.'}`);

  await pg.end();
}

main().catch(e => { console.error('ERROR verify:', e.message); process.exit(1); });
