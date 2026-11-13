import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  MapPin,
  QrCode,
} from "lucide-react";
import { BackendStatus } from "@/components/shared/BackendStatus";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const MODULES = [
  "Authentication and role-based access",
  "Departments, courses, and academic terms",
  "Students, teachers, assignments, and enrollments",
  "Class schedules with conflict validation",
  "Teacher attendance sessions and dynamic QR tokens",
  "Student GPS check-in and attendance reports",
  "Attendance corrections and audit logs",
];

const FEATURES = [
  {
    icon: QrCode,
    title: "Rotating QR tokens",
    description:
      "Every session gets a live QR code that refreshes every 30 seconds.",
  },
  {
    icon: MapPin,
    title: "GPS verification",
    description:
      "Check-ins only count inside the classroom radius, within 30m accuracy.",
  },
  {
    icon: BarChart3,
    title: "Live reports",
    description:
      "Attendance rates and per-section breakdowns, ready the moment class ends.",
  },
];

const DEV_LINKS = [
  { label: "API (proxied, same origin)", value: "/api/v1" },
  { label: "Frontend", value: "http://localhost:3000" },
  { label: "Backend direct", value: "http://localhost:8001/api/v1" },
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 size-[420px] rounded-full bg-brand-200/45 blur-3xl" />
        <div className="absolute top-24 -right-32 size-[380px] rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-control bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-soft">
              <QrCode className="size-5" />
            </span>
            <span className="font-display text-[15px] font-extrabold tracking-tight">
              Smart<span className="text-brand-600">Attendance</span>
            </span>
          </div>
          <Link href="/login">
            <Button size="sm">Sign in</Button>
          </Link>
        </header>

        <section className="py-14 text-center lg:py-24">
          <span className="inline-flex items-center gap-2 rounded-pill border border-brand-100 bg-brand-50 px-4 py-1.5 text-xs font-bold text-brand-700">
            <span className="size-2 animate-pulse rounded-pill bg-brand-500" />
            Smart attendance platform
          </span>
          <h1 className="font-display mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
            Attendance that runs{" "}
            <span className="text-gradient-brand">itself.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Teachers open a session, students scan a 30-second QR code, and GPS
            does the honesty check. No roll calls, no paper, no arguments.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg">
                Sign in to your workspace
                <ArrowRight className="size-4.5" />
              </Button>
            </Link>
            <BackendStatus />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="flex size-11 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                <feature.icon className="size-5.5" />
              </span>
              <h2 className="font-display mt-4 text-lg font-bold">
                {feature.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </Card>
          ))}
        </section>

        <section className="mt-4">
          <Card className="p-6 sm:p-8">
            <h2 className="font-display text-lg font-bold">
              Developer quick links
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              The Next.js app proxies <code className="font-mono">/api</code>{" "}
              to the Laravel backend — same origin, no CORS.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {DEV_LINKS.map((link) => (
                <div
                  key={link.value}
                  className="rounded-control border border-hairline bg-canvas p-4"
                >
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    {link.label}
                  </p>
                  <code className="mt-1.5 block font-mono text-sm font-bold text-brand-700">
                    {link.value}
                  </code>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-4 mb-16">
          <Card className="p-6 sm:p-8">
            <h2 className="font-display text-lg font-bold">
              Completed backend modules
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              190 passing tests power everything below — the API is ready for
              this UI.
            </p>
            <ul className="mt-5 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {MODULES.map((module) => (
                <li
                  key={module}
                  className="flex items-start gap-3 text-sm text-slate-600"
                >
                  <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-success" />
                  {module}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <footer className="border-t border-hairline py-8 text-center text-xs font-medium text-slate-400">
          Smart Attendance — built with Laravel 12, PostgreSQL, and Next.js.
        </footer>
      </div>
    </main>
  );
}
