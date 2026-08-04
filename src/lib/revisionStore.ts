import { apiFetch } from "./apiClient";

export interface ScanRecord {
  inv: string;
  ts: string;
  notes?: string;
}

export interface ExpectedItem {
  inv: string;
  descripcion?: string;
}

export interface RevisionSession {
  id: string;
  userId?: number;
  mode: "responsable";
  target: {
    responsableId?: string | number;
    responsableNombre?: string;
    responsableTipo?: "Empleado" | "Institucion";
  };
  expected: ExpectedItem[];
  scans: ScanRecord[];
  notes?: string;
  createdAt: string;
}

export interface ScanPreferences {
  ignoreSpaces: boolean;
  uppercase: boolean;
  trim: boolean;
  autoCloseCameraAfter?: number;
}

const STORAGE_KEY = "rev:sessions";
const OLD_STORAGE_KEY = "rev:session";
const PREFS_KEY = "rev:prefs";
const MAX_SESSIONS = 5;

const DEFAULT_PREFS: ScanPreferences = {
  ignoreSpaces: true,
  uppercase: true,
  trim: true,
  autoCloseCameraAfter: undefined,
};

// ─── Preferences ──────────────────────────────────────────────────────────────

export function getPreferences(): ScanPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch (e) {
    console.error("Error loading scan preferences:", e);
  }
  return DEFAULT_PREFS;
}

export function savePreferences(prefs: ScanPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Error saving scan preferences:", e);
  }
}

export function normalizeInventoryCode(code: string, prefs: ScanPreferences): string {
  let normalized = code;
  if (prefs.trim) normalized = normalized.trim();
  if (prefs.ignoreSpaces) normalized = normalized.replace(/[\s-]/g, "");
  if (prefs.uppercase) normalized = normalized.toUpperCase();
  return normalized;
}

// ─── Session Map Helpers ──────────────────────────────────────────────────────

type SessionMap = Record<string, RevisionSession>;

function loadSessionMap(): SessionMap {
  try {
    const old = localStorage.getItem(OLD_STORAGE_KEY);
    if (old) {
      const oldSession: RevisionSession = JSON.parse(old);
      const map: SessionMap = { [oldSession.id]: oldSession };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      localStorage.removeItem(OLD_STORAGE_KEY);
      return map;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error loading sessions:", e);
  }
  return {};
}

function persistSessionMap(map: SessionMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Error saving sessions:", e);
  }
}

// ─── Public Session Functions ─────────────────────────────────────────────────

export function getAllSessions(userId?: number): RevisionSession[] {
  const map = loadSessionMap();
  const all = Object.values(map);
  if (userId !== undefined) return all.filter((s) => s.userId === userId);
  return all;
}

export function getSessionById(id: string): RevisionSession | null {
  const map = loadSessionMap();
  return map[id] ?? null;
}

export function canCreateNewSession(userId?: number): boolean {
  return getAllSessions(userId).length < MAX_SESSIONS;
}

export function saveSession(session: RevisionSession): void {
  const map = loadSessionMap();
  map[session.id] = session;
  persistSessionMap(map);
}

export function clearSession(sessionId: string): void {
  const map = loadSessionMap();
  delete map[sessionId];
  persistSessionMap(map);
}

export function createSession(
  mode: "responsable",
  target: RevisionSession["target"],
  expected: ExpectedItem[],
  userId?: number
): RevisionSession | null {
  const sessions = getAllSessions(userId);
  if (sessions.length >= MAX_SESSIONS) return null;

  const duplicate = sessions.find(
    (s) => String(s.target.responsableId) === String(target.responsableId)
  );
  if (duplicate) return null;

  const prefs = getPreferences();
  const session: RevisionSession = {
    id: crypto.randomUUID(),
    userId,
    mode,
    target,
    expected: expected.map((e) => ({
      inv: normalizeInventoryCode(e.inv, prefs),
      descripcion: e.descripcion,
    })),
    scans: [],
    createdAt: new Date().toISOString(),
  };
  saveSession(session);
  return session;
}

export function addScan(sessionId: string, inv: string, notes?: string): RevisionSession | null {
  const session = getSessionById(sessionId);
  if (!session) return null;

  const normalized = normalizeInventoryCode(inv, getPreferences());
  session.scans.push({ inv: normalized, ts: new Date().toISOString(), notes });
  saveSession(session);
  return session;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

export interface SessionAnalysis {
  found: Set<string>;
  missing: Set<string>;
  extra: Set<string>;
}

export function analyzeSession(session: RevisionSession): SessionAnalysis {
  const expectedInvSet = new Set(session.expected.map((e) => e.inv));
  const scannedSet = new Set(session.scans.map((s) => s.inv));

  const found = new Set<string>();
  for (const inv of expectedInvSet) { if (scannedSet.has(inv)) found.add(inv); }

  const missing = new Set<string>();
  for (const inv of expectedInvSet) { if (!scannedSet.has(inv)) missing.add(inv); }

  const extra = new Set<string>();
  for (const inv of scannedSet) { if (!expectedInvSet.has(inv)) extra.add(inv); }

  return { found, missing, extra };
}

// ─── API Sync Functions ───────────────────────────────────────────────────────

export async function syncSessionToSupabase(
  session: RevisionSession,
  userId: number
): Promise<void> {
  try {
    await apiFetch(`/api/revision/${session.id}`, {
      method: "PUT",
      body: JSON.stringify({
        id_usuario: userId,
        mode: session.mode,
        responsable_id: String(session.target.responsableId ?? ""),
        responsable_nombre: session.target.responsableNombre ?? "",
        responsable_tipo: session.target.responsableTipo ?? "",
        expected: session.expected,
        scans: session.scans,
        notes: session.notes ?? null,
        estatus: "activa",
      }),
    });
  } catch (e) {
    console.error("Error syncing session:", e);
  }
}

export async function getActiveSessionsFromSupabase(
  userId: number
): Promise<RevisionSession[]> {
  try {
    const res = await apiFetch<{ data: RevisionSession[] }>(`/api/revision?userId=${userId}`);
    return res.data;
  } catch (e) {
    console.error("Error fetching sessions:", e);
    return [];
  }
}

export async function finalizeSessionInSupabase(sessionId: string): Promise<void> {
  try {
    await apiFetch(`/api/revision/${sessionId}/finalizar`, { method: "PATCH" });
  } catch (e) {
    console.error("Error finalizing session:", e);
  }
}
