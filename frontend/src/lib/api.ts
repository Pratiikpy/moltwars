const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `API error ${res.status}`);
  }

  return res.json();
}

export function sseUrl(path: string): string {
  return `${BASE_URL}${path}`;
}
