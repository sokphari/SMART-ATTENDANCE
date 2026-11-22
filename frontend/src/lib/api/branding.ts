import { apiFetch } from "./client";

export type SystemBranding = {
  system_name: string;
  logo_url: string | null;
  primary_color: string;
};

export function fetchSystemBranding() {
  return apiFetch<{ data: SystemBranding }>("/api/v1/branding", { auth: false });
}

export function updateSystemBranding(input: SystemBranding) {
  return apiFetch<{ data: SystemBranding }>("/api/v1/admin/branding", {
    method: "PUT",
    body: input,
  });
}
