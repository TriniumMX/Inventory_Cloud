// Orquestador: Fase 0 (backup) + 01 + 02 + 04 contra 'inventory' (producción).
// 03-inmuebles.js EXCLUIDO por decisión.
const path  = require('path');
const { spawnSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const PROD_URL = process.env.DATABASE_URL.replace('inventory_QA', 'inventory');
console.log(`\n>>> TARGET: ${PROD_URL.replace(/:([^:@]+)@/, ':****@')}\n`);

const env = { ...process.env, DATABASE_URL: PROD_URL };
const scripts = ['00-backup.js', '01-schema-changes.js', '02-reload-legacy.js', '04-verify.js'];

for (const script of scripts) {
  console.log(`\n${'='.repeat(60)}\n>>> ${script}\n${'='.repeat(60)}`);
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], { env, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n❌ FALLÓ en ${script} (exit ${r.status}). Migración detenida.`);
    process.exit(1);
  }
}

console.log('\n✅ MIGRACIÓN A PRODUCCIÓN COMPLETADA.\n');
