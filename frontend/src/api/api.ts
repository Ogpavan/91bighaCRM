import { getStoredToken } from "@/lib/auth";

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getStoredToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body:
      options.body === undefined
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : JSON.stringify(options.body)
  });

  const raw = await response.text();
  const contentType = response.headers.get("content-type") || "";
  let data: (T & { message?: string }) | null = null;

  if (raw) {
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(raw) as T & { message?: string };
      } catch {
        throw new Error(`Invalid JSON response from ${path}.`);
      }
    } else {
      throw new Error(`Expected JSON response from ${path}, received ${contentType || "unknown content type"}.`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}.`);
  }

  if (!data) {
    throw new Error(`Empty response from ${path}.`);
  }

  return data;
}

export function resolveApiAssetUrl(path?: string | null): string {
  const value = String(path || "").trim();
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/uploads/")) {
    return apiBaseUrl ? `${apiBaseUrl}/api${value}` : `/api${value}`;
  }

  return value.startsWith("/") ? `${apiBaseUrl}${value}` : `${apiBaseUrl}/${value}`;
}
