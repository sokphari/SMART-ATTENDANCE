import { apiFetch } from "@/lib/api/client";
import { revalidateStudents } from "@/app/actions/revalidate";
import type { DepartmentOption, Paginated, Student, StudentInput } from "./types";

const STUDENTS_URL = "/api/v1/admin/students";

export function fetchStudents(params: URLSearchParams) {
  return apiFetch<Paginated<Student>>(`${STUDENTS_URL}?${params.toString()}`);
}

export function fetchStudent(id: number) {
  return apiFetch<{ data: Student }>(`${STUDENTS_URL}/${id}`);
}

export function fetchDepartments() {
  return apiFetch<Paginated<DepartmentOption>>("/api/v1/admin/departments?per_page=100");
}

export function createStudent(input: StudentInput) {
  return apiFetch<{ data: Student }>(STUDENTS_URL, { method: "POST", body: input }).then(async (result) => {
    await revalidateStudents();
    return result;
  });
}

export function updateStudent(id: number, input: Partial<StudentInput>) {
  return apiFetch<{ data: Student }>(`${STUDENTS_URL}/${id}`, { method: "PUT", body: input }).then(async (result) => {
    await revalidateStudents();
    return result;
  });
}

export function fetchStudentAttendance(id: number) {
  return apiFetch<Paginated<StudentAttendance>>(`/api/v1/admin/attendance?student_id=${id}&per_page=50`);
}

export type StudentAttendance = {
  id: number;
  status: string;
  checked_in_at: string | null;
  remarks: string | null;
  session: { session_date: string; class_section?: { section_code?: string; course?: { course_code?: string; name?: string } } } | null;
};

export type StudentEnrollment = {
  id: number;
  class_section_id: number;
  class_section?: { section_code: string; course?: { course_code: string; name: string }; semester?: { name: string } };
  student_id: number;
  enrollment_date: string;
  status: string;
};

export type ClassSectionOption = {
  id: number;
  section_code: string;
  status: string;
  course_id: number;
  semester_id: number;
  capacity: number;
  enrolled_count: number;
  course?: { course_code: string; name: string };
  semester?: { name?: string };
  schedules?: { period?: string | null; start_time: string; end_time: string; status: string }[];
};

export function fetchStudentEnrollments(studentId: number) {
  return apiFetch<Paginated<StudentEnrollment>>(`/api/v1/admin/enrollments?student_id=${studentId}&per_page=100`);
}

export function fetchClassSections() {
  return apiFetch<Paginated<ClassSectionOption>>("/api/v1/admin/class-sections?per_page=100");
}

export async function fetchAllClassSections() {
  const first = await fetchClassSections();
  const sections = [...first.data];
  for (let page = 2; page <= (first.meta?.last_page ?? 1); page += 1) {
    const next = await apiFetch<Paginated<ClassSectionOption>>(`/api/v1/admin/class-sections?per_page=100&page=${page}`);
    sections.push(...next.data);
  }
  return sections;
}

export function createEnrollment(input: { student_id: number; class_section_id: number }) {
  return apiFetch<{ data: StudentEnrollment }>("/api/v1/admin/enrollments", { method: "POST", body: input });
}

export function transferStudentClass(enrollmentId: number, targetClassSectionId: number) {
  return apiFetch<{ data: StudentEnrollment }>(`/api/v1/admin/enrollments/${enrollmentId}/transfer`, {
    method: "POST",
    body: { target_class_section_id: targetClassSectionId },
  });
}


export type RegistrationLinkResponse = {
  id: number;
  url: string;
  expires_at: string;
  status: "active" | "used" | "revoked" | "expired";
};

const REGISTRATION_LINKS_URL = "/api/v1/admin/student-registration-links";

export function generateStudentRegistrationLink() {
  return apiFetch<{ data: RegistrationLinkResponse }>(REGISTRATION_LINKS_URL, {
    method: "POST",
    body: {},
  }).then((result) => result.data);
}

export function fetchStudentRegistrationLink(id: number) {
  return apiFetch<{ data: Pick<RegistrationLinkResponse, "status" | "expires_at"> }>(
    `${REGISTRATION_LINKS_URL}/${id}`,
  ).then((result) => result.data);
}

export function revokeStudentRegistrationLink(id: number) {
  return apiFetch<{ data: Pick<RegistrationLinkResponse, "status" | "expires_at"> }>(
    `${REGISTRATION_LINKS_URL}/${id}/revoke`,
    { method: "POST", body: {} },
  ).then((result) => result.data);
}

export type StudentRegistrationDepartment = { id: number; name: string; code: string };
export type PublicRegistrationState = {
  status: "active" | "used" | "revoked" | "expired";
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
};

export function fetchPublicRegistrationState(token: string) {
  return apiFetch<{ data: PublicRegistrationState }>(
    `/api/v1/student-registrations/${encodeURIComponent(token)}`,
    { auth: false },
  ).then((result) => result.data);
}

export function fetchPublicRegistrationDepartments(token: string) {
  return apiFetch<{ data: StudentRegistrationDepartment[] }>(
    `/api/v1/student-registrations/${encodeURIComponent(token)}/departments`,
    { auth: false },
  ).then((result) => result.data);
}

export type StudentRegistrationInput = {
  first_name: string;
  last_name: string;
  gender: "male" | "female";
  department_id: number;
  year_level: number;
  phone: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export type StudentRegistrationResult = {
  student: Student;
  enrollment: Student["current_enrollment"];
  section_created: boolean;
};

export function submitStudentRegistration(token: string, input: StudentRegistrationInput) {
  return apiFetch<{ data: StudentRegistrationResult; message: string }>(
    `/api/v1/student-registrations/${encodeURIComponent(token)}`,
    { method: "POST", auth: false, body: input },
  ).then((result) => result.data);
}
