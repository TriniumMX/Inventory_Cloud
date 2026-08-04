// Configuración y helpers compartidos para la migración ACTIVO (SQL Server) -> inventory_QA (PostgreSQL)
const path = require('path');
// override:false = si DATABASE_URL ya viene del proceso padre (run-production.js), no se pisa
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: false });
const sql = require('mssql');
const { Pool } = require('pg');

const sqlConfig = {
  user: process.env.DB_USER?.trim(),
  password: process.env.DB_PASSWORD?.trim(),
  server: process.env.DB_SERVER?.trim(),
  database: process.env.DB_DATABASE?.trim(),
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 30000,
  requestTimeout: 180000,
};

function pgPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

async function mssqlConnect() {
  return sql.connect(sqlConfig);
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ── Helpers de limpieza de datos ────────────────────────────────────
// nchar de SQL Server viene con padding de espacios al final -> trim.
// Los espacios internos se conservan (no corromper nombres/descripciones).
function cleanStr(v, max) {
  if (v == null) return null;
  let s = String(v).replace(/[\r\n\t]+/g, ' ').trim();
  if (s === '') return null;
  if (max && s.length > max) s = s.substring(0, max);
  return s;
}

// Texto multilínea -> una sola línea, colapsa espacios (para descripcion/direccion)
function cleanMultiline(v, max) {
  if (v == null) return null;
  let s = String(v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (s === '') return null;
  if (max && s.length > max) s = s.substring(0, max);
  return s;
}

function toNumeric(v) {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function toInt(v) {
  if (v == null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function toDate(v) {
  if (v == null) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toBool(v, def = true) {
  if (v == null) return def;
  return v === true || v === 1 || v === '1';
}

module.exports = {
  sql, sqlConfig, pgPool, mssqlConnect, log,
  cleanStr, cleanMultiline, toNumeric, toInt, toDate, toBool,
};
