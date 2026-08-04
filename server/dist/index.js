"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const activos_1 = __importDefault(require("./routes/activos"));
const catalogos_1 = __importDefault(require("./routes/catalogos"));
const inmuebles_1 = __importDefault(require("./routes/inmuebles"));
const resguardos_1 = __importDefault(require("./routes/resguardos"));
const usuarios_1 = __importDefault(require("./routes/usuarios"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const revision_1 = __importDefault(require("./routes/revision"));
const empleados_1 = __importDefault(require("./routes/empleados"));
const auditLogs_1 = __importDefault(require("./routes/auditLogs"));
const permisos_1 = __importDefault(require("./routes/permisos"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || "5199");
// ── Middlewares ──────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:8080", "http://localhost:5199"];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin))
            callback(null, true);
        else
            callback(new Error("CORS no permitido"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// ── Archivos estáticos (PDFs de escrituras) ──────────────
const uploadsDir = path_1.default.resolve(process.env.UPLOADS_DIR || "./uploads");
app.use("/uploads", express_1.default.static(uploadsDir));
// ── Rutas ────────────────────────────────────────────────
app.use("/api/auth", auth_1.default);
app.use("/api/activos", activos_1.default);
app.use("/api/catalogos", catalogos_1.default);
app.use("/api/inmuebles", inmuebles_1.default);
app.use("/api/resguardos", resguardos_1.default);
app.use("/api/usuarios", usuarios_1.default);
app.use("/api/dashboard", dashboard_1.default);
app.use("/api/revision", revision_1.default);
app.use("/api/empleados", empleados_1.default);
app.use("/api/audit-logs", auditLogs_1.default);
app.use("/api/permisos", permisos_1.default);
// ── Health check ─────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// ── Servir frontend estático (producción) ─────────────────
const distPath = path_1.default.resolve(__dirname, "../../dist");
if (fs_1.default.existsSync(distPath)) {
    app.use(express_1.default.static(distPath));
    // SPA fallback — React Router
    app.get("*", (_req, res) => {
        res.sendFile(path_1.default.join(distPath, "index.html"));
    });
}
// ── Iniciar servidor ─────────────────────────────────────
const server = app.listen(PORT, () => {
    console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
});
// Graceful shutdown: cierra el pool de BD antes de salir para no dejar conexiones zombi
async function shutdown() {
    server.close(() => {
        db_1.pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
    });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
exports.default = app;
