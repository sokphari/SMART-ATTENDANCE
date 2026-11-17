import { apiFetch } from "@/lib/api/client";
import type { Paginated } from "@/features/students/types";
import type { ManagedUser, TeacherModulePermission } from "./types";

const USERS_URL = "/api/v1/admin/users";

export function fetchUsers(params: URLSearchParams) {
  return apiFetch<Paginated<ManagedUser>>(`${USERS_URL}?${params.toString()}`);
}

export function updateUser(id: number, input: { name: string; email: string; password?: string; status: string }) {
  return apiFetch<{ data: ManagedUser }>(`${USERS_URL}/${id}`, { method: "PUT", body: input });
}

export function deactivateUser(id: number) {
  return apiFetch<void>(`${USERS_URL}/${id}`, { method: "DELETE" });
}

export function fetchTeacherPermissions() {
  return apiFetch<{ data: Record<string, boolean> }>("/api/v1/teacher/permissions");
}

export function fetchRolePermissions() {
  return apiFetch<{ data: { teacher: TeacherModulePermission[] } }>("/api/v1/admin/role-permissions");
}

export function saveTeacherPermissions(permissions: Record<string, boolean>) {
  return apiFetch<{ data: { teacher: TeacherModulePermission[] } }>("/api/v1/admin/role-permissions/teacher", {
    method: "PUT",
    body: { permissions },
  });
}
