import { apiFetch } from "@/lib/api/client";
import type { LoginResponse } from "./types";
import type { AuthUser } from "@/types/auth";

export type AuthProfile = AuthUser & {
  avatar_url: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export function getCurrentUser() {
  return apiFetch<{ data: AuthProfile }>("/api/v1/auth/me");
}

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
