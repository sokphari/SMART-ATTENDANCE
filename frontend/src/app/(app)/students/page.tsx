import { StudentsView } from "@/features/students/components/StudentsView";
import { apiClient } from "@/lib/api-client";
import type { Paginated, Student } from "@/features/students/types";

export const metadata = {
  title: "Students",
};

export default async function StudentsViewPage() {
  let initialData: Paginated<Student> | null = null;

  try {
    initialData = await apiClient<Paginated<Student>>(
      "/api/v1/admin/students?page=1&per_page=10",
      { revalidate: 300, tags: ["students"] },
    );
  } catch {
    // The client view can retry using its browser-side token if needed.
  }

  return <StudentsView initialData={initialData} />;
}
