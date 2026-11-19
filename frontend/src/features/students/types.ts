export type Student = {
  id: number;
  user_id: number;
  user: { id: number; name: string; email: string; status: string } | null;
  department_id: number;
  department: { id: number; name: string; code: string } | null;
  student_code: string;
  year_level: number;
  phone: string | null;
  gender: string | null;
  current_enrollment?: {
    id: number;
    class_section_id: number;
    course_id: number | null;
    semester_id: number | null;
    section_code: string | null;
    section_status: string | null;
    course_name: string | null;
    department_name: string | null;
    semester_name: string | null;
    academic_year: string | null;
    needs_setup: boolean;
  } | null;
  created_at: string;
  updated_at: string;
};

export type DepartmentOption = { id: number; name: string; code: string };
export type StudentInput = {
  name: string;
  email: string;
  password?: string;
  status?: string;
  department_id: number;
  student_code: string;
  year_level: number;
  phone?: string;
  gender?: string | null;
};

export type Paginated<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number };
};
