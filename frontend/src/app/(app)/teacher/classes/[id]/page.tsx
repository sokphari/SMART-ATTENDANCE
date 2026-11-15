import { TeacherClassDetailView } from "@/features/teacher-portal/components/TeacherClassDetailView";

export const metadata = { title: "Class details" };

export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sectionId = Number(id);
  if (!Number.isInteger(sectionId) || sectionId < 1) return <p className="text-sm text-danger">Invalid class section.</p>;
  return <TeacherClassDetailView sectionId={sectionId} />;
}
