export type Course = {
  id: number;
  department_id: number;
  department: { id: number; name: string; code: string } | null;
  course_code: string;
  name: string;
  description: string | null;
  credits: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type CourseInput = {
  department_id: number;
  course_code: string;
  name: string;
  description?: string | null;
  credits: number;
  status?: Course["status"];
};

export type DepartmentOption = { id: number; name: string; code: string; status: "active" | "inactive" };
export type Paginated<T> = { data: T[]; meta?: { current_page: number; last_page: number; total: number } };
