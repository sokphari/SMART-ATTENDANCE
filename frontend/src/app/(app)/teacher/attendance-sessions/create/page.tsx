import { TeacherSessionCreateView } from "@/features/teacher-portal/components/TeacherSessionCreateView";

export const metadata = { title: "Open attendance session" };

export default async function TeacherAttendanceSessionCreatePage({ searchParams }: { searchParams: Promise<{ class_section_id?: string }> }) {
  const { class_section_id } = await searchParams;
  const initialSectionId = Number(class_section_id);
  return <TeacherSessionCreateView initialSectionId={Number.isInteger(initialSectionId) && initialSectionId > 0 ? initialSectionId : undefined} />;
}
