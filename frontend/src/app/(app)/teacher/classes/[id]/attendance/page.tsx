import { TeacherClassAttendanceView } from "@/features/teacher-portal/components/TeacherClassAttendanceView";

export const metadata = { title: "Take attendance" };

export default async function TeacherClassAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sectionId = Number(id);
  if (!Number.isInteger(sectionId) || sectionId < 1) return <p className="text-sm text-danger">Invalid class section.</p>;
  return <TeacherClassAttendanceView sectionId={sectionId} />;
}
