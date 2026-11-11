import { AcademicYearFormView } from "@/features/academic-years/components/AcademicYearFormView";

export const metadata = { title: "Create academic year" };

export default function CreateAcademicYearPage() {
  return <AcademicYearFormView mode="create" />;
}
