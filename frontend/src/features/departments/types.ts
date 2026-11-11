export type Department = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type DepartmentInput = Pick<Department, "name" | "code"> & {
  description?: string | null;
  status?: Department["status"];
};

export type Paginated<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number };
};
