const BASE = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, body: unknown) {
    super(`API ${status}`);
    this.status = status;
    // FastAPI обычно возвращает {detail: "..."} или {detail: [{...}]}
    // Если внутри body есть поле detail — берём именно его.
    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      "detail" in body
    ) {
      this.detail = (body as { detail: unknown }).detail;
    } else {
      this.detail = body;
    }
  }
}

/**
 * Преобразует detail (строку, массив Pydantic-ошибок или что-то ещё)
 * в одну строку для показа пользователю.
 */
export function formatApiError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    const d = e.detail;
    if (typeof d === "string" && d.length > 0) return d;
    if (Array.isArray(d)) {
      return d
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return JSON.stringify(item);
        })
        .join("; ");
    }
    if (d && typeof d === "object") {
      return JSON.stringify(d);
    }
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body as T;
}