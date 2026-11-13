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
  capacity: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type ClassSectionInput = {
  course_id: number;
  semester_id: number;
  section_code: string;
  capacity: number;
  status?: "active" | "inactive";
};

export type CourseOption = {
  id: number;
  course_code: string;
  name: string;
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

