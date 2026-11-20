export type ClassSection = {
  id: number;
  course_id: number;
  course: {
    id: number;
    course_code: string;
    name: string;
    department?: {
      id: number;
      name: string;
      code: string;
    };
  } | null;
  semester_id: number;
  semester: {
    id: number;
    name: string;
    academic_year_id: number;
    status: string;
  } | null;
  section_code: string;
  class_start_date?: string | null;
  class_end_date?: string | null;
  capacity: number;
  status: "active" | "inactive" | "pending_setup";
  enrolled_count?: number;
  teachers?: {
    id?: number;
    name: string;
    code?: string;
    role?: string;
  }[];
  schedules?: {
    id: number;
    day_of_week: number | string;
    start_time: string;
    end_time: string;
    room?: string;
    period?: string | null;
    status?: "active" | "inactive";
  }[];
  created_at: string;
  updated_at: string;
};

export type ClassSectionInput = {
  course_id: number;
  semester_id: number;
  section_code: string;
  capacity: number;
  status?: "active" | "inactive" | "pending_setup";
  program_id?: number | null;
  year_level?: number | null;
  teacher_id?: number;
  class_start_date?: string;
  class_end_date?: string;
  schedules?: { classroom_id: number; day_of_week: number; start_time: string; end_time: string; effective_from?: string; effective_until?: string }[];
};

export type CourseOption = {
  id: number;
  course_code: string;
  name: string;
  department_id?: number;
};

export type SemesterOption = {
  id: number;
  name: string;
  academic_year?: { name: string } | null;
};

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
};

