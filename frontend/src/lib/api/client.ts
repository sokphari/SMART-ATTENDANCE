import { getToken } from "./session";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  cache?: RequestCache;
};

const REQUEST_TIMEOUT_MS = 20_000;

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth ? getToken() : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: options.cache ?? "no-store",
      signal: controller.signal,
    });

    if (response.status === 204) return null as T;

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const record = (payload ?? {}) as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      const gatewayUnavailable = [502, 503, 504].includes(response.status);
      throw new ApiError(
        gatewayUnavailable
          ? "The attendance server is temporarily unavailable. Check that the backend is running, then try again."
          : record.message ?? `Request failed with status ${response.status}.`,
        response.status,
        record.errors ?? {},
      );
    }

    return payload as T;
  } catch (caught) {
    if (caught instanceof ApiError) throw caught;
    if (controller.signal.aborted) {
      throw new ApiError("The server did not respond in time. Please try again.", 0);
    }
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      0,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
