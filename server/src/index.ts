import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

import { pool } from "./db";
import authRouter from "./routes/auth";
import activosRouter from "./routes/activos";
import catalogosRouter from "./routes/catalogos";
import inmueblesRouter from "./routes/inmuebles";
import resguardosRouter from "./routes/resguardos";
import usuariosRouter from "./routes/usuarios";
import dashboardRouter from "./routes/dashboard";
import revisionRouter from "./routes/revision";
import empleadosRouter from "./routes/empleados";
import auditLogsRouter from "./routes/auditLogs";
import permisosRouter from "./routes/permisos";

const app = express();
const PORT = parseInt(process.env.PORT || "5199");

// ── Middlewares ──────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5199"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else { console.error("[CORS] Origen rechazado:", origin, "permitidos:", allowedOrigins); callback(new Error("CORS no permitido")); }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Archivos estáticos (PDFs de escrituras) ──────────────
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || "./uploads");
app.use("/uploads", express.static(uploadsDir));

// ── Rutas ────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/activos", activosRouter);
app.use("/api/catalogos", catalogosRouter);
app.use("/api/inmuebles", inmueblesRouter);
app.use("/api/resguardos", resguardosRouter);
app.use("/api/usuarios", usuariosRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/revision", revisionRouter);
app.use("/api/empleados", empleadosRouter);
app.use("/api/audit-logs", auditLogsRouter);
app.use("/api/permisos", permisosRouter);

// ── Health check ─────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Servir frontend estático (producción) ─────────────────
const distPath = path.resolve(__dirname, "../../dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — React Router
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ── Iniciar servidor ─────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
});

// Graceful shutdown: cierra el pool de BD antes de salir para no dejar conexiones zombi
async function shutdown() {
  server.close(() => {
    pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
