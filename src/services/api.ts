/**
 * The ONLY network client in the app. It talks to the ShreePay backend (VITE_API_URL) and nothing else:
 * the upstream payment API is never referenced from the browser.
 */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: { field: string; message: string }[]) {
    super(message);
  }
}

type Opts = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; query?: Record<string, string | number | undefined | null> };

export async function api<T = unknown>(path: string, { method = 'GET', body, query }: Opts = {}): Promise<T> {
  const qs = query
    ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString()
    : '';
  let res: Response;
  try {
    res = await fetch(API_URL + path + (qs === '?' ? '' : qs), {
      method,
      credentials: 'include', // HttpOnly session cookie; no token ever touches JS or localStorage
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection.');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new ApiError(res.status, json?.error?.code ?? 'ERROR', json?.error?.message ?? 'Request failed', json?.error?.details);
  }
  return json.data as T;
}

export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
