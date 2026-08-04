const { Pool } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT setval('resguardos_id_resguardo_seq', (SELECT MAX(id_resguardo) FROM resguardos))"
    );
    console.log("Sequence reset to:", rows[0].setval);

    // Also check and fix activos sequence while we're here
    const { rows: rows2 } = await client.query(
      "SELECT setval('activos_id_consecutivo_seq', (SELECT MAX(id_consecutivo) FROM activos))"
    );
    console.log("activos sequence reset to:", rows2[0].setval);
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(console.error);
