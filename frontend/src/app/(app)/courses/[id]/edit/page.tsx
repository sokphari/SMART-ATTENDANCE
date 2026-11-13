import { CourseFormView } from "@/features/courses/components/CourseFormView";

export const metadata = { title: "Edit course" };

export default function EditCoursePage() {
  return <CourseFormView mode="edit" />;
}
