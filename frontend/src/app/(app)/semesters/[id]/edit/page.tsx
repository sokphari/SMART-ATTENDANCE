import { SemesterFormView } from "@/features/semesters/components/SemesterFormView";

export const metadata = { title: "Edit semester" };

export default function EditSemesterPage() {
  return <SemesterFormView mode="edit" />;
}
