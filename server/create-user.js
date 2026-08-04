require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createUser() {
  const hash = await bcrypt.hash('12345678', 10);
  const { rows } = await pgPool.query(
    `INSERT INTO usuarios (nombre, usuario, password_hash, permisos)
     VALUES ($1, $2, $3, $4)
     RETURNING id_usuario, nombre, usuario, permisos`,
    ['Carlos Adrián Trejo Ramírez', 'CATR27', hash, 1]
  );
  console.log('Usuario creado:', rows[0]);
  await pgPool.end();
}

createUser().catch(err => { console.error(err.message); process.exit(1); });
