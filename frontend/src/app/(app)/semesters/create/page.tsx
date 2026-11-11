import { SemesterFormView } from "@/features/semesters/components/SemesterFormView";

export const metadata = { title: "Create semester" };

export default function CreateSemesterPage() {
  return <SemesterFormView mode="create" />;
}
