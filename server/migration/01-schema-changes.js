// Fase 1 — Cambios de esquema en inventory_QA (idempotente).
//  1. Tabla catálogo `tipos` (1=MUEBLES, 2=ENSERES, 3=INMUEBLES)
//  2. usuarios.administrador BOOLEAN
//  3. Asegurar anchos de columnas (ultimo_nomina, numero_serie, resguardos.nomina)
// La FK activos.tipo -> tipos.id_tipo se agrega en 02 (después de recargar, con solo 1 y 2).
const { pgPool, mssqlConnect, sql, log } = require('./lib');

async function main() {
  const pg = pgPool();
  const c = await pg.connect();
  try {
    // 1. Catálogo tipos
    log('Creando catálogo tipos...');
    await c.query(`
      CREATE TABLE IF NOT EXISTS tipos (
        id_tipo SMALLINT PRIMARY KEY,
        tipo    VARCHAR(50),
        estatus SMALLINT NOT NULL DEFAULT 1
      )`);

    // Poblar desde SQL Server (fidelidad: MUEBLES/ENSERES/INMUEBLES)
    const sp = await mssqlConnect();
    const tipos = (await sp.request().query('SELECT id_tipo, tipo FROM TIPOS')).recordset;
    await sql.close();
    for (const t of tipos) {
      await c.query(
        `INSERT INTO tipos (id_tipo, tipo) VALUES ($1, $2)
         ON CONFLICT (id_tipo) DO UPDATE SET tipo = EXCLUDED.tipo`,
        [t.id_tipo, String(t.tipo).trim()]
      );
    }
    log(`  tipos poblado: ${tipos.length} filas (${tipos.map(t => t.tipo.trim()).join(', ')})`);

    // 2. usuarios.administrador
    log('Agregando usuarios.administrador...');
    await c.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS administrador BOOLEAN DEFAULT FALSE`);

    // 3. Anchos de columnas (seguros por si el estado actual difiere)
    log('Asegurando anchos de columnas...');
    await c.query(`ALTER TABLE activos    ALTER COLUMN ultimo_nomina TYPE VARCHAR(100)`);
    await c.query(`ALTER TABLE activos    ALTER COLUMN numero_serie  TYPE VARCHAR(100)`);
    await c.query(`ALTER TABLE resguardos ALTER COLUMN nomina        TYPE VARCHAR(60)`);

    log('Fase 1 completa.');
  } catch (e) {
    console.error('ERROR Fase 1:', e.message);
    process.exit(1);
  } finally {
    c.release();
    await pg.end();
  }
}

main();
