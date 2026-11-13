export type Semester = {
  id: number;
  academic_year_id: number;
  academic_year: { id: number; name: string; start_date: string; end_date: string; status: string } | null;
  name: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "completed";
  created_at: string;
  updated_at: string;
};

export type SemesterInput = Pick<Semester, "academic_year_id" | "name" | "start_date" | "end_date"> & { status?: Semester["status"] };
export type AcademicYearOption = { id: number; name: string; start_date: string; end_date: string; status: string };
export type Paginated<T> = { data: T[]; meta?: { current_page: number; last_page: number; total: number } };
