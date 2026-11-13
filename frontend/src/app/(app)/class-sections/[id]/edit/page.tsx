import { ClassSectionFormView } from "@/features/class-sections/components/ClassSectionFormView";

export const metadata = {
  title: "Edit Class Section",
};

export default function EditClassSectionPage() {
  return <ClassSectionFormView mode="edit" />;
}

