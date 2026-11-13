import { apiFetch } from "@/lib/api/client";
import { revalidateClasses } from "@/app/actions/revalidate";
import type {
  ClassSection,
  ClassSectionInput,
  CourseOption,
  Paginated,
  SemesterOption,
} from "./types";

const CLASS_SECTIONS_URL = "/api/v1/admin/class-sections";

export function fetchClassSections(params: URLSearchParams) {
  return apiFetch<Paginated<ClassSection>>(
    `${CLASS_SECTIONS_URL}?${params.toString()}`,
  );
}

export function fetchClassSection(id: number) {
  return apiFetch<{ data: ClassSection }>(`${CLASS_SECTIONS_URL}/${id}`);
}

export function createClassSection(input: ClassSectionInput) {
  return apiFetch<{ data: ClassSection }>(CLASS_SECTIONS_URL, {
    method: "POST",
    body: input,
  }).then(async (result) => {
    await revalidateClasses();
    return result;
  });
}

export function updateClassSection(
  id: number,
  input: Partial<ClassSectionInput>,
) {
  return apiFetch<{ data: ClassSection }>(`${CLASS_SECTIONS_URL}/${id}`, {
    method: "PUT",
    body: input,
  }).then(async (result) => {
    await revalidateClasses();
    return result;
  });
}

export function deleteClassSection(id: number) {
  return apiFetch<null>(`${CLASS_SECTIONS_URL}/${id}`, {
    method: "DELETE",
  }).then(async (result) => {
    await revalidateClasses();
    return result;
  });
}

export function fetchCoursesOptions() {
  return apiFetch<Paginated<CourseOption>>(
    "/api/v1/admin/courses?status=active&per_page=100",
  );
}

export function fetchSemestersOptions() {
  return apiFetch<Paginated<SemesterOption>>(
    "/api/v1/admin/semesters?per_page=100",
  );
}

