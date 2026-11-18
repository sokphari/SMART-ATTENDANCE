import { ClassSectionDetailView } from "@/features/class-sections/components/ClassSectionDetailView";

export const metadata = { title: "Class roster" };

export default async function ClassSectionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sectionId = Number(id);
  if (!Number.isInteger(sectionId) || sectionId < 1) return <p role="alert" className="text-sm text-danger">Invalid class section.</p>;
  return <ClassSectionDetailView sectionId={sectionId} />;
}
