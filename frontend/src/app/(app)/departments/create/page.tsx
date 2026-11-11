import { DepartmentFormView } from "@/features/departments/components/DepartmentFormView";

export const metadata = { title: "Create department" };

export default function CreateDepartmentPage() {
  return <DepartmentFormView mode="create" />;
}
