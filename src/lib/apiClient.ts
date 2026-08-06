const API_URL = import.meta.env.VITE_API_URL as string;

function getToken(): string | null {
  try {
    const stored = localStorage.getItem("auth:user");
    if (!stored) return null;
    return JSON.parse(stored)?.token ?? null;
  } catch {
    return null;
  }
}

function authHeaders(isFormData: boolean): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  // Con FormData, el navegador debe fijar Content-Type con el boundary del multipart.
  if (!isFormData) headers["Content-Type"] = "application/json";
  return headers;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(isFormData),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export { API_URL };
