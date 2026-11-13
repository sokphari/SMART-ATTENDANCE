"use server";

import { revalidateTag } from "next/cache";

export async function revalidateStudents(): Promise<void> {
  revalidateTag("students", "max");
}

export async function revalidateClasses(): Promise<void> {
  revalidateTag("classes", "max");
  revalidateTag("academic-terms", "max");
}
