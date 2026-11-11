import { CourseFormView } from "@/features/courses/components/CourseFormView";

export const metadata = { title: "Create course" };

export default function CreateCoursePage() {
  return <CourseFormView mode="create" />;
}
