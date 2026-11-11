"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchTeacher } from "../api";
import type { Teacher } from "../types";

export function TeacherProfileView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const teacherId = Number(id);
    if (!Number.isInteger(teacherId) || teacherId < 1) { setError("Teacher was not found."); setLoading(false); return; }
    fetchTeacher(teacherId).then(({ data }) => setTeacher(data)).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load teacher profile.")).finally(() => setLoading(false));
  }, [id]);

  return <>
    <PageHeader title="Teacher profile" description="Teacher contact, department, and account details." actions={<div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => router.push("/teachers")}><ArrowLeft className="size-4" />Back to teachers</Button>{teacher && <Button size="sm" onClick={() => router.push(`/teachers/${teacher.id}/edit`)}>Edit teacher</Button>}</div>} />
    {error && <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
    {loading ? <Card className="w-full p-8 text-sm text-muted">Loading teacher…</Card> : teacher && <Card className="w-full p-5 sm:p-7">
      <div className="flex items-center gap-4 border-b border-hairline pb-5"><span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600"><GraduationCap className="size-7" /></span><div><h2 className="font-display text-xl font-bold">{teacher.user?.name ?? "Teacher"}</h2><p className="mt-1 text-sm text-muted">{teacher.teacher_code}</p><div className="mt-2"><Badge tone={teacher.user?.status === "active" ? "success" : teacher.user?.status === "suspended" ? "danger" : "neutral"}>{teacher.user?.status ?? "unknown"}</Badge></div></div></div>
      <dl className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">{[["Email", teacher.user?.email ?? "—"], ["Phone", teacher.phone || "—"], ["Department", teacher.department?.name ?? "—"], ["Department code", teacher.department?.code ?? "—"], ["Created", new Date(teacher.created_at).toLocaleString()], ["Last updated", new Date(teacher.updated_at).toLocaleString()]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl>
    </Card>}
  </>;
}
