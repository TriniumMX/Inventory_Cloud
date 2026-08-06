import { apiFetch } from "../apiClient";

export async function listTiposInmueble() {
  const { data } = await apiFetch<{ data: any[] }>("/api/inmuebles/tipos");
  return data;
}

export async function checkNumeroInventarioInmuebleExists(
  numeroInventario: string,
  excludeId?: string
): Promise<boolean> {
  const qs = new URLSearchParams({ numero: numeroInventario });
  if (excludeId) qs.set("excludeId", excludeId);
  const { data } = await apiFetch<{ data: boolean }>(`/api/inmuebles/check-inventario?${qs.toString()}`);
  return data;
}

export async function listBienesInmuebles() {
  const { data } = await apiFetch<{ data: any[] }>("/api/inmuebles");
  return data;
}

export async function createBienInmueble(dto: Record<string, string | undefined>) {
  await apiFetch<{ data: null }>("/api/inmuebles", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateBienInmueble(id: number, dto: Record<string, string | undefined>) {
  await apiFetch<{ data: null }>(`/api/inmuebles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

// ── Escrituras PDF ────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadEscritura(inmuebleId: number, _numeroInventario: string, file: File): Promise<string> {
  if (file.type !== "application/pdf") throw new Error("Solo se permiten archivos PDF");
  if (file.size > MAX_FILE_SIZE) throw new Error("El archivo excede el tamaño máximo de 10 MB");

  const form = new FormData();
  form.append("file", file);

  const { data } = await apiFetch<{ data: { fileName: string } }>(`/api/inmuebles/${inmuebleId}/escritura`, {
    method: "POST",
    body: form,
  });
  return data.fileName;
}

export async function deleteEscritura(inmuebleId: number, _filePath: string): Promise<void> {
  await apiFetch<{ data: null }>(`/api/inmuebles/${inmuebleId}/escritura`, { method: "DELETE" });
}

export async function getEscrituraSignedUrl(inmuebleId: number): Promise<string> {
  const { data } = await apiFetch<{ data: { url: string } }>(`/api/inmuebles/${inmuebleId}/escritura/url`);
  return data.url;
}
