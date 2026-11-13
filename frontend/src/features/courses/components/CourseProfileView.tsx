"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchCourse } from "../api";
import type { Course } from "../types";

export function CourseProfileView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const courseId = Number(id);
    if (!Number.isInteger(courseId) || courseId < 1) { setError("Course was not found."); setLoading(false); return; }
    fetchCourse(courseId).then(({ data }) => setCourse(data)).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load course.")).finally(() => setLoading(false));
  }, [id]);

  return <>
    <PageHeader title="Course details" description="Course catalog information and department assignment." actions={<div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => router.push("/courses")}><ArrowLeft className="size-4" />Back to courses</Button>{course && <Button size="sm" onClick={() => router.push(`/courses/${course.id}/edit`)}>Edit course</Button>}</div>} />
    {error && <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
    {loading ? <Card className="w-full p-8 text-sm text-muted">Loading course…</Card> : course && <Card className="w-full p-5 sm:p-7"><div className="flex items-center gap-4 border-b border-hairline pb-5"><span className="flex size-14 items-center justify-center rounded-panel bg-brand-50 text-brand-600"><BookOpen className="size-7" /></span><div><h2 className="font-display text-xl font-bold">{course.name}</h2><p className="mt-1 text-sm text-muted">{course.course_code}</p><div className="mt-2"><Badge tone={course.status === "active" ? "success" : "neutral"}>{course.status}</Badge></div></div></div><dl className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">{[["Department", course.department?.name ?? "—"], ["Department code", course.department?.code ?? "—"], ["Credits", String(course.credits)], ["Description", course.description || "—"], ["Created", new Date(course.created_at).toLocaleString()], ["Last updated", new Date(course.updated_at).toLocaleString()]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl></Card>}
  </>;
}
