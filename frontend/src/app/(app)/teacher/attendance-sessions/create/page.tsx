import { redirect } from "next/navigation";

export const metadata = { title: "Open attendance session" };

export default function TeacherAttendanceSessionCreatePage() {
  redirect("/teacher/classes");
}
