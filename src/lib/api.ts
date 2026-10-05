export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? data.message ?? "Permintaan gagal. Coba lagi.");
  return data;
}
