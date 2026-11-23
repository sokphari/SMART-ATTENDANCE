import { ReportsView } from "@/features/reports/components/ReportsView";

export const metadata = { title: "Attendance reports" };

export default function TeacherAttendanceReportPage() {
  return <ReportsView role="teacher" />;
}
