import { cookies } from "next/headers";

export type ServerApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  revalidate?: number;
  tags?: string[];
  noStore?: boolean;
};

const backendUrl =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.API_PROXY_URL ??
  "http://localhost:8001";

/** Server-side API client for App Router Server Components and Actions. */
export async function apiClient<T>(
  path: string,
  options: ServerApiOptions = {},
): Promise<T> {
  const token = (await cookies()).get("smart_attendance_token")?.value;
  const url = path.startsWith("http") ? path : `${backendUrl}${path}`;
  const headers: Record<string, string> = { Accept: "application/json" };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: options.noStore ? "no-store" : "force-cache",
    ...(options.noStore
      ? {}
      : {
          next: {
            revalidate: options.revalidate ?? 300,
            tags: options.tags ?? [],
          },
        }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (payload as { message?: string } | null)?.message ??
        `Backend request failed with status ${response.status}.`,
    );
  }

  return payload as T;
}
