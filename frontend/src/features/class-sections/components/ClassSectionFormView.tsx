"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  createClassSection,
  fetchClassSection,
  fetchCoursesOptions,
  fetchSemestersOptions,
  updateClassSection,
} from "../api";
import type { ClassSectionInput, CourseOption, SemesterOption } from "../types";

const blankSection: ClassSectionInput = {
  course_id: 0,
  semester_id: 0,
  section_code: "",
  capacity: 35,
  status: "active",
};

const NOTICE_KEY = "sa_class_section_notice";

export function ClassSectionFormView({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = Number(params?.id);

  const [form, setForm] = useState<ClassSectionInput>(blankSection);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCoursesOptions()
      .then((res) => setCourses(res.data))
      .catch(() => setCourses([]));

    fetchSemestersOptions()
      .then((res) => setSemesters(res.data))
      .catch(() => setSemesters([]));

    if (mode === "edit") {
      if (!Number.isInteger(id) || id < 1) {
        setError("Section not found.");
        setLoading(false);
        return;
      }
      fetchClassSection(id)
        .then(({ data }) =>
          setForm({
            course_id: data.course_id,
            semester_id: data.semester_id,
            section_code: data.section_code,
            capacity: data.capacity,
            status: data.status,
          }),
        )
        .catch((caught) =>
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Could not load class section.",
          ),
        )
        .finally(() => setLoading(false));
    }
  }, [id, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.course_id) {
      setError("Please select a course.");
      return;
    }
    if (!form.semester_id) {
      setError("Please select a semester.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      if (mode === "create") {
        await createClassSection(form);
        window.sessionStorage.setItem(
          NOTICE_KEY,
          "Class section created successfully.",
        );
      } else {
        await updateClassSection(id, form);
        window.sessionStorage.setItem(
          NOTICE_KEY,
          "Class section updated successfully.",
        );
      }
      router.replace("/class-sections");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? Object.values(caught.errors).flat()[0] ?? caught.message
          : `Could not ${mode} class section.`,
      );
      setSaving(false);
    }
  }

  const title = mode === "create" ? "Create Class Section" : "Edit Class Section";

  return (
    <>
      <PageHeader
        title={title}
        description={
          mode === "create"
            ? "Offer a course in a specific semester with designated capacity."
            : "Update section capacity, code, or active status."
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/class-sections")}
          >
            <ArrowLeft className="size-4" />
            Back to sections
          </Button>
        }
      />

      {loading ? (
        <Card className="w-full p-8 text-sm text-muted">
          Loading section details…
        </Card>
      ) : (
        <Card className="w-full p-5 sm:p-7">
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold">
              Course <span className="text-danger">*</span>
              <select
                required
                value={form.course_id || ""}
                onChange={(e) =>
                  setForm({ ...form, course_id: Number(e.target.value) })
                }
                className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
              >
                <option value="">Select a course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code} — {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-semibold">
              Semester <span className="text-danger">*</span>
              <select
                required
                value={form.semester_id || ""}
                onChange={(e) =>
                  setForm({ ...form, semester_id: Number(e.target.value) })
                }
                className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
              >
                <option value="">Select a semester</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{" "}
                    {s.academic_year ? `(${s.academic_year.name})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <Input
              label="Section Code"
              placeholder="e.g. A, B, 01"
              required
              maxLength={30}
              value={form.section_code}
              onChange={(e) =>
                setForm({
                  ...form,
                  section_code: e.target.value.toUpperCase(),
                })
              }
            />

            <Input
              label="Capacity"
              type="number"
              min={1}
              max={500}
              required
              value={String(form.capacity)}
              onChange={(e) =>
                setForm({ ...form, capacity: Number(e.target.value) })
              }
            />

            {mode === "edit" && (
              <label className="space-y-1.5 text-sm font-semibold sm:col-span-2">
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-hairline pt-4 sm:col-span-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/class-sections")}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="size-4" />
                {mode === "create" ? "Create section" : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

