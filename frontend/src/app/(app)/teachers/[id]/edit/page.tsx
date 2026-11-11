import { TeacherFormView } from "@/features/teachers/components/TeacherFormView";

export const metadata = { title: "Edit teacher" };

export default function EditTeacherPage() {
  return <TeacherFormView mode="edit" />;
}
