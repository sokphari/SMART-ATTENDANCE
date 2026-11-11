import { apiFetch } from "@/lib/api/client";
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
  return apiFetch<{ data: Student }>(STUDENTS_URL, { method: "POST", body: input });
}

export function updateStudent(id: number, input: Partial<StudentInput>) {
  return apiFetch<{ data: Student }>(`${STUDENTS_URL}/${id}`, { method: "PUT", body: input });
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
  course?: { course_code: string; name: string };
};

export function fetchStudentEnrollments(studentId: number) {
  return apiFetch<Paginated<StudentEnrollment>>(`/api/v1/admin/enrollments?student_id=${studentId}&per_page=100`);
}

export function fetchClassSections() {
  return apiFetch<Paginated<ClassSectionOption>>("/api/v1/admin/class-sections?per_page=100");
}

export function createEnrollment(input: { student_id: number; class_section_id: number }) {
  return apiFetch<{ data: StudentEnrollment }>("/api/v1/admin/enrollments", { method: "POST", body: input });
}
