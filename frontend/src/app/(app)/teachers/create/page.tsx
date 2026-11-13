import { TeacherFormView } from "@/features/teachers/components/TeacherFormView";

export const metadata = { title: "Create teacher" };

export default function CreateTeacherPage() {
  return <TeacherFormView mode="create" />;
}
