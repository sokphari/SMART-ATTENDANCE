export type Teacher = {
  id: number;
  user_id: number;
  user: { id: number; name: string; email: string; status: string } | null;
  department_id: number;
  department: { id: number; name: string; code: string } | null;
  teacher_code: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type TeacherInput = {
  name: string;
  email: string;
  password?: string;
  status?: string;
  department_id: number;
  teacher_code: string;
  phone?: string;
};

export type DepartmentOption = { id: number; name: string; code: string };
export type Paginated<T> = { data: T[]; meta?: { current_page: number; last_page: number; total: number } };
