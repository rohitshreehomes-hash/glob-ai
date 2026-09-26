// Client-side helpers (safe to import from "use client" components).

export const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS ?? 15000);
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "BharatTrade";

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function stockUrl(symbol: string): string {
  return `/stock/${encodeURIComponent(symbol)}`;
}
