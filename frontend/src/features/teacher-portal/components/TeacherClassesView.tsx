"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Search, Users } from "lucide-react";
import { getMyClassSections } from "../api";
import type { TeacherClassSection } from "../types";

export function TeacherClassesView() {
  const [sections, setSections] = useState<TeacherClassSection[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyClassSections().then((response) => setSections(response.data)).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Unable to load assigned classes.");
    }).finally(() => setLoading(false));
  }, []);

  const filtered = sections.filter((section) => `${section.course.code} ${section.course.name} ${section.section_code} ${section.semester.name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full space-y-6">
      <header><p className="text-sm font-semibold text-brand-600">Teacher workspace</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">My classes</h1><p className="mt-2 text-sm text-muted">Review rosters and schedules for your assigned class sections.</p></header>
      <div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search course, code, section, or semester" className="h-11 w-full rounded-control border border-hairline bg-card pl-10 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" /></div>
      {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((n) => <div key={n} className="h-48 animate-pulse rounded-panel border border-hairline bg-card" />)}</div> : filtered.length === 0 ? <div className="rounded-panel border border-hairline bg-card p-10 text-center"><BookOpen className="mx-auto size-8 text-muted" /><p className="mt-3 font-semibold">{sections.length ? "No classes match your search" : "No assigned classes yet"}</p><p className="mt-1 text-sm text-muted">Your administrator can assign class sections to your teacher account.</p></div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{filtered.map((section) => <article key={section.id} className="rounded-panel border border-hairline bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3"><div className="flex size-11 items-center justify-center rounded-control bg-brand-50 text-brand-600"><BookOpen className="size-5" /></div><span className="rounded-pill bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">{section.status}</span></div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-pill bg-brand-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{section.course.code}</span><span className="rounded-pill bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Section {section.section_code}</span>{section.course.department && <span className="rounded-pill bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{section.course.department}</span>}</div><h2 className="mt-2 font-display text-lg font-bold">{section.course.name}</h2>
          <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4 text-sm"><span className="text-muted">{section.semester.name} {section.semester.academic_year ? `· ${section.semester.academic_year}` : ""}</span><span className="inline-flex items-center gap-1.5 font-semibold"><Users className="size-4 text-brand-600" />{section.enrolled_count}/{section.capacity}</span></div>
          <Link href={`/teacher/classes/${section.id}`} className="mt-4 flex min-h-10 items-center justify-center rounded-control bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700">View Class</Link>
        </article>)}</div>
      )}
    </div>
  );
}
