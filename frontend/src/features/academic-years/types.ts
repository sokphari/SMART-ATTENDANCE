export type AcademicYear = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "completed";
  semesters_count?: number;
  created_at: string;
  updated_at: string;
};

export type AcademicYearInput = Pick<AcademicYear, "name" | "start_date" | "end_date"> & { status?: AcademicYear["status"] };
export type Paginated<T> = { data: T[]; meta?: { current_page: number; last_page: number; total: number } };
