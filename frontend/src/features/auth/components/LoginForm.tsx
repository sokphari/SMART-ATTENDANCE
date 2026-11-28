"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  MapPin,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import { getStoredUser, getToken, setSession } from "@/lib/api/session";
import { setAuthCookie } from "@/app/actions/auth";
import { login } from "../api";
import { hasPendingStudentScan } from "@/features/attendance/studentScanPending";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useLocale } from "@/i18n/LocaleProvider";

const HIGHLIGHTS = [
  {
    icon: QrCode,
    title: "Rotating QR tokens",
    description: "A fresh code every 30 seconds. Screenshots are useless.",
  },
  {
    icon: MapPin,
    title: "GPS verification",
    description: "Check-ins only count inside the classroom radius.",
  },
  {
    icon: BarChart3,
    title: "Live reports",
    description: "Attendance rates and trends the moment class ends.",
  },
];

export function LoginForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let queryEmail: string | null = null;
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      queryEmail = url.searchParams.get("email");
      const hadLoginParams = ["email", "password", "remember"].some((key) =>
        url.searchParams.has(key),
      );
      if (hadLoginParams) {
        url.searchParams.delete("email");
        url.searchParams.delete("password");
        url.searchParams.delete("remember");
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
    }

    if (getToken()) {
      router.replace(getStoredUser()?.role?.toLowerCase() === "student" && hasPendingStudentScan()
        ? "/student/scan"
        : getStoredUser()?.role?.toLowerCase() === "teacher" ? "/teacher/dashboard" : "/dashboard");
    } else if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("smart_attendance_remember_email");
      if (queryEmail || savedEmail) {
        setEmail(queryEmail ?? savedEmail ?? "");
        setRememberMe(!queryEmail && Boolean(savedEmail));
      }
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("smart_attendance_remember_email", email);
        } else {
          localStorage.removeItem("smart_attendance_remember_email");
        }
      }

      const payload = await login(email, password);
      setSession(payload.token, payload.data);
      await setAuthCookie(payload.token, rememberMe);
      const role = payload.data.role?.toLowerCase();
      const destination = role === "student" && hasPendingStudentScan()
        ? "/student/scan"
        : role === "teacher" ? "/teacher/dashboard" : "/dashboard";
      setSuccess(true);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      router.replace(destination);
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        caught.status >= 500 &&
        ![502, 503, 504].includes(caught.status)
      ) {
        // Never expose Laravel/PHP stack or filesystem details on the sign-in page.
        setError(new ApiError(t("Unable to sign in right now. Please try again shortly."), caught.status));
      } else {
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(t("Something went wrong. Please try again."), 0),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 size-[380px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-[-100px] bottom-[-80px] size-[420px] rounded-full bg-indigo-400/25 blur-3xl" />
        </div>

        <Link
          href="/"
          className="relative flex items-center gap-3"
          aria-label="Back to home"
        >
          <BrandLogo iconSize={42} inverse />
        </Link>

        <div className="relative max-w-md">
          <h1 className="font-display text-4xl leading-[1.1] font-extrabold tracking-tight xl:text-5xl">
            {t("Attendance that runs")} <span className="text-brand-200">{t("itself.")}</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-brand-100/90">
            {t("Teachers open a session, students scan a live QR code, and GPS does the honesty check — no roll calls, no paper, no arguments.")}
          </p>
          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white/12 backdrop-blur">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">{t(item.title)}</p>
                  <p className="mt-0.5 text-sm text-brand-100/80">
                    {t(item.description)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs font-medium text-brand-100/60">
          Smart Attendance · Laravel 12 API + Next.js
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="animate-fade-up w-full max-w-md">
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2.5 lg:hidden"
            aria-label="Back to home"
          >
            <BrandLogo iconSize={38} centered />
          </Link>

          <div className="rounded-panel border border-hairline bg-card p-8 shadow-lift sm:p-10">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              {t("Welcome back")}
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              {t("Sign in to your Smart Attendance workspace.")}
            </p>

            {error && (
              <div role="alert" aria-live="assertive" className="mt-6 flex items-start gap-3 rounded-control border border-red-100 bg-danger-soft p-3.5 text-sm font-medium text-red-800">
                <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
                <div>
                  <p>{error.message}</p>
                  {error.status === 502 && (
                    <p className="mt-1 text-xs font-normal">
                      The API proxy could not reach Laravel. In Docker, check that it targets http://nginx; for local development, check that Nginx is running at http://localhost:8001.
                    </p>
                  )}
                </div>
              </div>
            )}

            {success && (
              <div role="status" aria-live="polite" className="mt-6 flex items-center gap-3 rounded-control border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="size-5 shrink-0" />
                <span>{t("Signed in successfully. Redirecting to your dashboard…")}</span>
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <Input
                label={t("Email")}
                name="email"
                type="email"
                placeholder="you@school.edu"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={error?.errors?.email?.[0]}
              />
              <Input
                label={t("Password")}
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={error?.errors?.password?.[0]}
                action={
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      t(showPassword ? "Hide password" : "Show password")
                    }
                    className="flex size-8 cursor-pointer items-center justify-center rounded-[10px] text-slate-400 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-600"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                }
              />

              <div className="flex items-center justify-between pt-0.5">
                <label
                  htmlFor="remember-me"
                  className="group flex cursor-pointer select-none items-center gap-2.5"
                >
                  <input
                    type="checkbox"
                    name="remember"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="size-4 cursor-pointer rounded border-hairline bg-card text-brand-600 accent-brand-600 transition-colors focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-0"
                  />
                  <span className="text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">
                    {t("Remember me")}
                  </span>
                </label>
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                {t("Sign in")}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            {t("No account yet? Ask your campus admin to invite you.")}
          </p>
        </div>
      </main>
    </div>
  );
}
