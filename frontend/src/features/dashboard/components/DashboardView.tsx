"use client";

import { useCallback, useEffect, useState } from "react";
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
import type { DashboardSummary } from "../types";
import { BreakdownCard } from "./BreakdownCard";
import { StatCard } from "./StatCard";

const QUICK_LINKS = ["/students", "/schedules", "/attendance", "/reports"];

export function DashboardView() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchDashboardSummary();
      setSummary(payload.data);
    } catch (caught) {
      const apiError =
        caught instanceof ApiError
          ? caught
          : new ApiError("Something went wrong.", 0);
      if (apiError.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A campus-wide snapshot of people, classes, and activity."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={load}
            loading={loading}
          >
            <RotateCw className="size-4" />
            Refresh
          </Button>
        }
      />

      {error && (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load the dashboard"
            description={error.message}
          >
            <Button variant="secondary" onClick={load}>
              Try again
            </Button>
          </EmptyState>
        </Card>
      )}

      {summary && !error && (
        <div className="animate-fade-up">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={GraduationCap}
              label="Students"
              value={summary.counts.students.total}
              hint={`${summary.counts.students.active.toLocaleString()} active`}
              trend={summary.trends.students_last_30_days}
            />
            <StatCard
              icon={Users}
              label="Teachers"
              value={summary.counts.teachers.total}
              hint={`${summary.counts.teachers.active.toLocaleString()} active`}
              trend={summary.trends.teachers_last_30_days}
            />
            <StatCard
              icon={CheckCircle2}
              label="Enrollments"
              value={summary.counts.enrollments.total}
              hint={`${summary.counts.enrollments.enrolled.toLocaleString()} currently enrolled`}
              trend={summary.trends.enrollments_last_30_days}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StatCard
              icon={Building2}
              label="Departments"
              value={summary.counts.departments.total}
              hint={`${summary.counts.departments.active.toLocaleString()} active`}
            />
            <StatCard
              icon={ArrowUpRight}
              label="Classrooms"
              value={summary.counts.classrooms.total}
              hint={`${summary.counts.classrooms.active.toLocaleString()} active`}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <BreakdownCard
              title="Users by role"
              total={summary.counts.users.total}
              rows={[
                {
                  label: "students",
                  value: summary.counts.users.students,
                  bar: "bg-brand-600",
                  dot: "bg-brand-600",
                },
                {
                  label: "teachers",
                  value: summary.counts.users.teachers,
                  bar: "bg-indigo-500",
                  dot: "bg-indigo-500",
                },
                {
                  label: "admins",
                  value: summary.counts.users.admins,
                  bar: "bg-slate-400",
                  dot: "bg-slate-400",
                },
              ]}
            />
            <BreakdownCard
              title="Enrollments by status"
              total={summary.counts.enrollments.total}
              rows={[
                {
                  label: "enrolled",
                  value: summary.counts.enrollments.enrolled,
                  bar: "bg-success",
                  dot: "bg-success",
                },
                {
                  label: "completed",
                  value: summary.counts.enrollments.completed,
                  bar: "bg-brand-600",
                  dot: "bg-brand-600",
                },
                {
                  label: "dropped",
                  value: summary.counts.enrollments.dropped,
                  bar: "bg-warning",
                  dot: "bg-warning",
                },
              ]}
            />
          </div>

          <div className="mt-8">
            <h2 className="text-xs font-bold tracking-[0.08em] text-slate-400 uppercase">
              Jump back in
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {QUICK_LINKS.map((href) => {
                const item = ALL_NAV_ITEMS.find((nav) => nav.href === href);
                if (!item) return null;

                return (
                  <Link key={item.href} href={item.href} className="group">
                    <Card className="h-full p-5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lift">
                      <div className="flex items-center justify-between">
                        <span className="flex size-10 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                          <item.icon className="size-5" />
                        </span>
                        <ArrowUpRight className="size-5 text-slate-300 transition-colors duration-200 group-hover:text-brand-600" />
                      </div>
                      <p className="font-display mt-4 font-bold">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {item.description}
                      </p>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
