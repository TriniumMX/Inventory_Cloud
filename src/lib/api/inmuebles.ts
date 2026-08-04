import { apiFetch, API_URL } from "../apiClient";

export async function listTiposInmueble() {
  const res = await apiFetch<{ data: { id: number; nombre: string; descripcion: string | null }[] }>(
    "/api/inmuebles/tipos"
  );
  return res.data;
}

export async function checkNumeroInventarioInmuebleExists(
  numeroInventario: string,
  excludeId?: string
): Promise<boolean> {
  const q = new URLSearchParams({ numero: numeroInventario });
  if (excludeId) q.set("excludeId", excludeId);
  const res = await apiFetch<{ data: boolean }>(`/api/inmuebles/check-inventario?${q}`);
  return res.data;
}

export async function listBienesInmuebles() {
  const res = await apiFetch<{ data: any[] }>("/api/inmuebles");
  return res.data;
}

export async function createBienInmueble(dto: Record<string, string | undefined>) {
  await apiFetch("/api/inmuebles", { method: "POST", body: JSON.stringify(dto) });
}

export async function updateBienInmueble(id: number, dto: Record<string, string | undefined>) {
  await apiFetch(`/api/inmuebles/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
}

// ── Storage: Escrituras PDF ──────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadEscritura(
  inmuebleId: number,
  _numeroInventario: string,
  file: File
): Promise<string> {
  if (file.type !== "application/pdf") throw new Error("Solo se permiten archivos PDF");
  if (file.size > MAX_FILE_SIZE) throw new Error("El archivo excede el tamaño máximo de 10 MB");

  const token = (() => {
    try { return JSON.parse(localStorage.getItem("auth:user") || "{}")?.token ?? ""; }
    catch { return ""; }
  })();

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/inmuebles/${inmuebleId}/escritura`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error al subir el archivo");
  }

  const data = await res.json();
  return data.data.fileName as string;
}

export async function deleteEscritura(inmuebleId: number, _filePath: string): Promise<void> {
  await apiFetch(`/api/inmuebles/${inmuebleId}/escritura`, { method: "DELETE" });
}

export async function getEscrituraSignedUrl(filePath: string): Promise<string> {
  // Extraer el ID del inmueble no es posible desde el filePath solo,
  // pero el nombre del archivo ya es la URL pública directa.
  return `${API_URL}/uploads/escrituras/${filePath}`;
}
