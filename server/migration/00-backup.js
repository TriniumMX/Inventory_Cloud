// Fase 0 — Respaldo JSON de las tablas de inventory_QA que la migración va a modificar.
// Genera server/backups/qa-backup-<timestamp>.json con filas + valor actual de secuencias.
// Restaurable con migration/restore-backup.js <archivo>.
const fs = require('fs');
const path = require('path');
const { pgPool, log } = require('./lib');

const TABLES = [
  'clasificacion', 'ctas_contables', 'consignas', 'usuarios',
  'activos', 'resguardos', 'bienes_inmuebles', 'tipos_inmueble',
];

async function main() {
  const pg = pgPool();
  const backup = { created_at: new Date().toISOString(), database: 'inventory_QA', tables: {}, sequences: {} };

  for (const t of TABLES) {
    const exists = await pg.query(`SELECT to_regclass($1) AS r`, [`public.${t}`]);
    if (!exists.rows[0].r) { log(`(omito ${t}: no existe)`); continue; }
    const rows = (await pg.query(`SELECT * FROM ${t}`)).rows;
    backup.tables[t] = rows;
    log(`${t}: ${rows.length} filas respaldadas`);
  }

  // Secuencias relevantes
  const seqs = (await pg.query(`
    SELECT c.relname AS seq FROM pg_class c WHERE c.relkind='S'
  `)).rows.map(r => r.seq);
  for (const s of seqs) {
    try {
      const v = await pg.query(`SELECT last_value, is_called FROM ${s}`);
      backup.sequences[s] = v.rows[0];
    } catch (_) {}
  }

  const dir = path.resolve(__dirname, '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `qa-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 0));
  log(`\nRespaldo escrito: ${file}`);
  log(`Tamaño: ${(fs.statSync(file).size / 1024 / 1024).toFixed(2)} MB`);

  await pg.end();
}

main().catch(e => { console.error('ERROR backup:', e.message); process.exit(1); });
