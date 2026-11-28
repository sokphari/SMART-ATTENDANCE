"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  RotateCw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError } from "@/lib/api/client";
import { clearSession } from "@/lib/api/session";
import { ALL_NAV_ITEMS } from "@/config/nav";
import { fetchDashboardSummary } from "../api";
import { getOverview, getWeekly } from "@/features/reports/api";
import type { ReportOverview, WeeklyReport } from "@/features/reports/types";
import { fetchClassSections } from "@/features/class-sections/api";
import type { ClassSection, Paginated as ClassSectionPage } from "@/features/class-sections/types";
import { fetchAttendanceRecords } from "@/features/attendance/api";
import type { AttendanceRecord, Paginated as AttendancePage } from "@/features/attendance/types";
import { SELECTED_SEMESTER_KEY } from "@/features/schedules/api";
import { useLocale } from "@/i18n/LocaleProvider";
import type { DashboardSummary } from "../types";
import { BreakdownCard } from "./BreakdownCard";
import { StatCard } from "./StatCard";
import {
  AttendanceTrendChart,
  DailyVolumeChart,
  DepartmentBarChart,
  StatusDonutChart,
  type DepartmentPoint,
  type DailyPoint,
  type StatusPoint,
  type TrendPoint,
  type TrendRange,
} from "./AnalyticsCharts";

const QUICK_LINKS = ["/students", "/schedules", "/attendance", "/reports"];
const QUICK_ICON_TONES = [
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
];
const CAMPUS_TIMEZONE = "Asia/Phnom_Penh";

function campusToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CAMPUS_TIMEZONE }).format(new Date());
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function mondayOf(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return shiftDate(date, -(weekday === 0 ? 6 : weekday - 1));
}

function localizedDay(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

function getHourInCampus(isoDate: string | null) {
  if (!isoDate) return null;
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TIMEZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(isoDate));
  const parsed = Number(hour);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchAllClassSections(semesterId: string) {
  const rows: ClassSection[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const params = new URLSearchParams({ page: String(page), per_page: "100" });
    if (semesterId) params.set("semester_id", semesterId);
    const result: ClassSectionPage<ClassSection> = await fetchClassSections(params);
    rows.push(...result.data);
    lastPage = result.meta?.last_page ?? page;
    page += 1;
  } while (page <= lastPage);
  return rows;
}

async function fetchHourlyAttendance(semesterId: string, today: string): Promise<TrendPoint[]> {
  const rows: AttendanceRecord[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const params = new URLSearchParams({ date_from: today, date_to: today, page: String(page), per_page: "100" });
    if (semesterId) params.set("semester_id", semesterId);
    const result: AttendancePage<AttendanceRecord> = await fetchAttendanceRecords(params);
    rows.push(...result.data);
    lastPage = result.meta?.last_page ?? page;
    page += 1;
  } while (page <= lastPage);

  if (rows.length === 0) return [];

  const bins = Array.from({ length: 12 }, (_, index) => ({
    label: `${String(index * 2).padStart(2, "0")}:00`,
    present: 0,
    late: 0,
    absent: 0,
  }));
  for (const row of rows) {
    const eventTime = row.checked_in_at ?? row.created_at ?? row.session?.closes_at;
    const hour = getHourInCampus(eventTime);
    if (hour === null) continue;
    const bin = bins[Math.min(11, Math.floor(hour / 2))];
    if (row.status === "present") bin.present += 1;
    if (row.status === "late") bin.late += 1;
    if (row.status === "absent") bin.absent += 1;
  }

  return bins.map((bin) => {
    const denominator = bin.present + bin.late + bin.absent;
    return {
      label: bin.label,
      rate: denominator ? ((bin.present + bin.late) / denominator) * 100 : 0,
      checkIns: bin.present + bin.late,
    };
  });
}

export function DashboardView() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [analyticsRefresh, setAnalyticsRefresh] = useState(0);
  const [trendRange, setTrendRange] = useState<TrendRange>("7d");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [hourlyPoints, setHourlyPoints] = useState<TrendPoint[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchDashboardSummary();
      setSummary(payload.data);
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : new ApiError(t("Something went wrong."), 0);
      if (apiError.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => { void load(); }, [load]);

  const refreshDashboard = useCallback(() => {
    void load();
    setAnalyticsRefresh((value) => value + 1);
  }, [load]);

  useEffect(() => {
    const syncSemester = (event?: Event) => {
      const detail = event ? (event as CustomEvent<{ semesterId?: number | null }>).detail : null;
      if (detail && Object.prototype.hasOwnProperty.call(detail, "semesterId")) {
        setSelectedSemesterId(detail.semesterId ? String(detail.semesterId) : "");
      } else {
        setSelectedSemesterId(window.localStorage.getItem(SELECTED_SEMESTER_KEY) ?? "");
      }
    };
    syncSemester();
    window.addEventListener("sa-semester-change", syncSemester);
    return () => window.removeEventListener("sa-semester-change", syncSemester);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const today = campusToday();
    const params = new URLSearchParams();
    if (selectedSemesterId) params.set("semester_id", selectedSemesterId);
    if (trendRange === "24h") {
      params.set("date_from", today);
      params.set("date_to", today);
    } else if (trendRange === "7d") {
      params.set("date_from", shiftDate(today, -6));
      params.set("date_to", today);
    } else if (trendRange === "30d") {
      params.set("date_from", shiftDate(today, -29));
      params.set("date_to", today);
    }

    const weeklyParams = new URLSearchParams({ week_start: mondayOf(today) });
    if (selectedSemesterId) weeklyParams.set("semester_id", selectedSemesterId);
    setAnalyticsLoading(true);
    setOverview(null);
    setWeekly(null);
    setClassSections([]);
    setHourlyPoints([]);

    const tasks = [
      getOverview("admin", params),
      getWeekly("admin", weeklyParams),
      fetchAllClassSections(selectedSemesterId),
      trendRange === "24h" ? fetchHourlyAttendance(selectedSemesterId, today) : Promise.resolve([] as TrendPoint[]),
    ] as const;

    Promise.allSettled(tasks).then((results) => {
      if (cancelled) return;
      const [overviewResult, weeklyResult, sectionsResult, hourlyResult] = results;
      if (overviewResult.status === "fulfilled") setOverview(overviewResult.value.data);
      if (weeklyResult.status === "fulfilled") setWeekly(weeklyResult.value.data);
      if (sectionsResult.status === "fulfilled") setClassSections(sectionsResult.value);
      if (hourlyResult.status === "fulfilled") setHourlyPoints(hourlyResult.value);
    }).finally(() => {
      if (!cancelled) setAnalyticsLoading(false);
    });

    return () => { cancelled = true; };
  }, [analyticsRefresh, selectedSemesterId, trendRange]);

  const trendPoints = useMemo<TrendPoint[]>(() => {
    if (trendRange === "24h") return hourlyPoints;
    return (overview?.attendance_trend ?? []).filter((item) => item.summary.rate_denominator > 0).map((item) => ({
      label: trendRange === "7d" || trendRange === "30d" ? localizedDay(item.date, locale) : item.date.slice(5),
      rate: item.summary.attendance_rate ?? 0,
      checkIns: item.summary.present + item.summary.late,
    }));
  }, [hourlyPoints, locale, overview, trendRange]);

  const statusPoints = useMemo<StatusPoint[]>(() => (["present", "late", "absent", "excused"] as const).map((status) => ({
    status,
    count: overview?.attendance_distribution.find((item) => item.status === status)?.count ?? 0,
  })), [overview]);

  const departmentPoints = useMemo<DepartmentPoint[]>(() => {
    if (!overview) return [];
    const departments = new Map<string, { attendance: number; opportunities: number }>();
    const sectionById = new Map<number, ClassSection>();
    classSections.forEach((section) => sectionById.set(section.id, section));
    overview.by_section.forEach((row) => {
      const name = sectionById.get(row.class_section_id)?.course?.department?.name;
      if (!name || row.attendance_rate === null || row.rate_denominator <= 0) return;
      const current = departments.get(name) ?? { attendance: 0, opportunities: 0 };
      current.attendance += row.attendance_rate * row.rate_denominator;
      current.opportunities += row.rate_denominator;
      departments.set(name, current);
    });
    return Array.from(departments, ([name, value]) => ({
      name,
      rate: value.opportunities ? value.attendance / value.opportunities : 0,
    }));
  }, [classSections, overview]);

  const dailyPoints = useMemo<DailyPoint[]>(() => (weekly?.summary.attendance_records ? weekly.daily_trend : [])
    .filter((item) => new Date(`${item.date}T12:00:00Z`).getUTCDay() !== 0)
    .map((item) => ({
      label: localizedDay(item.date, locale),
      present: item.summary.present,
      late: item.summary.late,
      absent: item.summary.absent,
    })), [locale, weekly]);

  return (
    <>
      <PageHeader
        title={t("Dashboard")}
        description={t("A campus-wide snapshot of people, classes, and activity.")}
        actions={<Button variant="secondary" size="sm" onClick={refreshDashboard} loading={loading || analyticsLoading}>
          <RotateCw className="size-4" />{t("Refresh")}
        </Button>}
      />

      {error && <Card><EmptyState icon={AlertTriangle} title={t("Couldn't load the dashboard")} description={error.message}>
        <Button variant="secondary" onClick={() => { void load(); }}>{t("Try again")}</Button>
      </EmptyState></Card>}

      {summary && !error && <div className="animate-fade-up min-w-0">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={GraduationCap} iconTone="blue" label={t("Students")} value={summary.counts.students.total} hint={`${summary.counts.students.active.toLocaleString()} ${t("active")}`} trend={summary.trends.students_last_30_days} t={t} />
          <StatCard icon={Users} iconTone="emerald" label={t("Teachers")} value={summary.counts.teachers.total} hint={`${summary.counts.teachers.active.toLocaleString()} ${t("active")}`} trend={summary.trends.teachers_last_30_days} t={t} />
          <StatCard icon={CheckCircle2} iconTone="violet" label={t("Enrollments")} value={summary.counts.enrollments.total} hint={`${summary.counts.enrollments.enrolled.toLocaleString()} ${t("currently enrolled")}`} trend={summary.trends.enrollments_last_30_days} t={t} />
          <StatCard icon={Building2} iconTone="indigo" label={t("Departments")} value={summary.counts.departments.total} hint={`${summary.counts.departments.active.toLocaleString()} ${t("active")}`} t={t} />
          <StatCard icon={ArrowUpRight} iconTone="amber" label={t("Classrooms")} value={summary.counts.classrooms.total} hint={`${summary.counts.classrooms.active.toLocaleString()} ${t("active")}`} t={t} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <BreakdownCard title={t("Users by role")} total={summary.counts.users.total} totalLabel={t("total")} rows={[
            { label: t("students"), value: summary.counts.users.students, bar: "bg-brand-600", dot: "bg-brand-600" },
            { label: t("teachers"), value: summary.counts.users.teachers, bar: "bg-indigo-500", dot: "bg-indigo-500" },
            { label: t("admins"), value: summary.counts.users.admins, bar: "bg-slate-400", dot: "bg-slate-400" },
          ]} />
          <BreakdownCard title={t("Enrollments by status")} total={summary.counts.enrollments.total} totalLabel={t("total")} rows={[
            { label: t("enrolled"), value: summary.counts.enrollments.enrolled, bar: "bg-success", dot: "bg-success" },
            { label: t("completed"), value: summary.counts.enrollments.completed, bar: "bg-brand-600", dot: "bg-brand-600" },
            { label: t("dropped"), value: summary.counts.enrollments.dropped, bar: "bg-warning", dot: "bg-warning" },
          ]} />
        </div>

        <section aria-label={t("Attendance analytics")} className="mt-7 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="min-w-0 lg:col-span-8"><AttendanceTrendChart t={t} points={trendPoints} range={trendRange} onRangeChange={setTrendRange} loading={analyticsLoading} /></div>
          <div className="min-w-0 lg:col-span-4"><StatusDonutChart t={t} points={statusPoints} overallRate={overview?.summary.attendance_rate ?? null} /></div>
          <div className="min-w-0 lg:col-span-6"><DepartmentBarChart t={t} points={departmentPoints} /></div>
          <div className="min-w-0 lg:col-span-6"><DailyVolumeChart t={t} points={dailyPoints} /></div>
        </section>

        <section className="mt-8" aria-labelledby="dashboard-quick-access">
          <h2 id="dashboard-quick-access" className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase">{t("Quick Access")}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_LINKS.map((href, index) => {
              const item = ALL_NAV_ITEMS.find((nav) => nav.href === href);
              if (!item) return null;
              return <Link key={item.href} href={item.href} className="min-w-0 rounded-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <Card className="h-full p-5 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <span className={`flex size-10 items-center justify-center rounded-control ${QUICK_ICON_TONES[index]}`}><item.icon className="size-5" /></span>
                    <ArrowUpRight className="size-5 text-slate-400" />
                  </div>
                  <p className="font-display mt-4 font-bold">{t(item.label)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{t(item.description)}</p>
                </Card>
              </Link>;
            })}
          </div>
        </section>
      </div>}
    </>
  );
}
