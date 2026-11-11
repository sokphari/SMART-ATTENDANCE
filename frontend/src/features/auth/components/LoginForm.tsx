"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  Eye,
  EyeOff,
  MapPin,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import { getToken, setSession } from "@/lib/api/session";
import { login } from "../api";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = await login(email, password);
      setSession(payload.token, payload.data);
      router.replace("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError("Something went wrong. Please try again.", 0),
      );
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
          <span className="flex size-10 items-center justify-center rounded-control bg-white/15 backdrop-blur">
            <QrCode className="size-5" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            Smart<span className="text-brand-200">Attendance</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="font-display text-4xl leading-[1.1] font-extrabold tracking-tight xl:text-5xl">
            Attendance that runs <span className="text-brand-200">itself.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-brand-100/90">
            Teachers open a session, students scan a live QR code, and GPS does
            the honesty check — no roll calls, no paper, no arguments.
          </p>
          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white/12 backdrop-blur">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-0.5 text-sm text-brand-100/80">
                    {item.description}
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
            <span className="flex size-9 items-center justify-center rounded-control bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-soft">
              <QrCode className="size-5" />
            </span>
            <span className="font-display text-base font-extrabold tracking-tight">
              Smart<span className="text-brand-600">Attendance</span>
            </span>
          </Link>

          <div className="rounded-panel border border-hairline bg-card p-8 shadow-lift sm:p-10">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Sign in to your Smart Attendance workspace.
            </p>

            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-control border border-red-100 bg-danger-soft p-3.5 text-sm font-medium text-red-800">
                <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
                <span>{error.message}</span>
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Email"
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
                label="Password"
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
                      showPassword ? "Hide password" : "Show password"
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
              <Button type="submit" className="w-full" loading={loading}>
                Sign in
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            No account yet? Ask your campus admin to invite you.
          </p>
        </div>
      </main>
    </div>
  );
}
