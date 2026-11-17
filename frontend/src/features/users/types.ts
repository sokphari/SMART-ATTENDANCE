export type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student" | string;
  status: "active" | "inactive" | "suspended" | string;
  created_at: string;
};

export type TeacherModulePermission = {
  key: string;
  label: string;
  enabled: boolean;
};
