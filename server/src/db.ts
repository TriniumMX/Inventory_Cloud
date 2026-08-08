import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // En serverless (Vercel) cada invocacion concurrente puede crear su propia
  // instancia de Pool; con el Session Pooler de Supabase (puerto 5432) esto
  // agota rapido el limite de sesiones del proyecto. Usar el Transaction
  // Pooler (puerto 6543) y mantener max/idleTimeout bajos evita saturarlo.
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err);
});
