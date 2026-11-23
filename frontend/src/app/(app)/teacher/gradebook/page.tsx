import { GradebookView } from "@/features/grades/components/GradebookView";

export const metadata = { title: "Gradebook" };
export default function TeacherGradebookPage() { return <GradebookView teacher />; }
