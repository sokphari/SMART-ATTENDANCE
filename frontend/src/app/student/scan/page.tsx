import { StudentScanView } from "@/features/attendance/components/StudentScanView";

export const metadata = {
  title: "Student QR Check-in",
  description: "Use your phone to confirm student attendance with a class QR code.",
};

export default function StudentScanPage() {
  return <StudentScanView />;
}
