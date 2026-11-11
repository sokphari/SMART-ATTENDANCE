import { DepartmentFormView } from "@/features/departments/components/DepartmentFormView";

export const metadata = { title: "Edit department" };

export default function EditDepartmentPage() {
  return <DepartmentFormView mode="edit" />;
}
