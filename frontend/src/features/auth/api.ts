import { apiFetch } from "@/lib/api/client";
import type { LoginResponse } from "./types";

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export function logout() {
  return apiFetch("/api/v1/auth/logout", { method: "POST" });
}
