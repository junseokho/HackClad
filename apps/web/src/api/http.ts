const API = import.meta.env.VITE_API_BASE_URL as string;

export async function httpPost<T>(path: string, body: any, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

export async function httpGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}
