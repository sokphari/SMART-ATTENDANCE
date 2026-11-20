export type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student" | string;
  status: "active" | "inactive" | "suspended" | string;
  teacher_id?: number | null;
  created_at: string;
};

export type TeacherModulePermission = {
  key: string;
  label: string;
  enabled: boolean;
};
