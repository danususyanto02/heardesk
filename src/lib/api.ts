export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const companyId = typeof document !== "undefined" ? document.querySelector<HTMLElement>("[data-company-id]")?.dataset.companyId : undefined;
  const response = await fetch(path, { ...options, headers: { ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(companyId && path.startsWith("/api/admin/") ? { "x-heardesk-company": companyId } : {}), ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? data.message ?? "Permintaan gagal. Coba lagi.");
  return data;
}
