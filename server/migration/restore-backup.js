// Restaura un respaldo JSON generado por 00-backup.js.
// Uso: node migration/restore-backup.js <ruta-al-json>
// TRUNCATE + reinserta filas exactas y restaura secuencias. Rollback total.
const fs = require('fs');
const { pgPool, log } = require('./lib');

// Orden de restauración respetando dependencias FK (padres primero)
const ORDER = ['clasificacion', 'ctas_contables', 'consignas', 'tipos_inmueble', 'usuarios', 'activos', 'bienes_inmuebles', 'resguardos'];

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) { console.error('Indica un archivo de respaldo válido.'); process.exit(1); }
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  const pg = pgPool();
  const c = await pg.connect();
  try {
    await c.query('BEGIN');
    await c.query('SET CONSTRAINTS ALL DEFERRED');

    // Truncar en orden inverso
    for (const t of [...ORDER].reverse()) {
      if (backup.tables[t]) await c.query(`TRUNCATE ${t} CASCADE`);
    }

    for (const t of ORDER) {
      const rows = backup.tables[t];
      if (!rows || rows.length === 0) { log(`${t}: 0 filas`); continue; }
      const cols = Object.keys(rows[0]);
      for (const row of rows) {
        const vals = cols.map(k => row[k]);
        const ph = cols.map((_, i) => `$${i + 1}`).join(',');
        await c.query(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${ph})`, vals);
      }
      log(`${t}: ${rows.length} filas restauradas`);
    }

    // Restaurar secuencias
    for (const [seq, v] of Object.entries(backup.sequences || {})) {
      try { await c.query(`SELECT setval($1, $2, $3)`, [seq, v.last_value, v.is_called]); } catch (_) {}
    }

    await c.query('COMMIT');
    log('\nRestauración completa.');
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('ERROR restore:', e.message);
    process.exit(1);
  } finally {
    c.release();
    await pg.end();
  }
}

main();
