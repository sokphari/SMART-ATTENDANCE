import { ClassSectionFormView } from "@/features/class-sections/components/ClassSectionFormView";

export const metadata = {
  title: "Create Class Section",
};

export default function CreateClassSectionPage() {
  return <ClassSectionFormView mode="create" />;
}

