import { AcademicYearFormView } from "@/features/academic-years/components/AcademicYearFormView";

export const metadata = { title: "Edit academic year" };

export default function EditAcademicYearPage() {
  return <AcademicYearFormView mode="edit" />;
}
