import { StudentQRRegistrationForm } from "@/features/students/components/StudentQRRegistrationForm";

export const metadata = { title: "Student registration | Smart Attendance" };

export default async function StudentRegistrationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <StudentQRRegistrationForm token={token} />;
}
