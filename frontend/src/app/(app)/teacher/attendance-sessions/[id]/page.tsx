import { TeacherSessionDetailView } from "@/features/teacher-portal/components/TeacherSessionDetailView";

export const metadata = { title: "Attendance session" };

export default async function TeacherAttendanceSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId) || sessionId < 1) return <p className="text-sm text-danger">Invalid attendance session.</p>;
  return <TeacherSessionDetailView sessionId={sessionId} />;
}
