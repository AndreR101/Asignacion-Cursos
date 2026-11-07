const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Error HTTP ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const apiJson = (path: string, body: unknown, method = "POST") =>
  api(path, { method, body: JSON.stringify(body) });
