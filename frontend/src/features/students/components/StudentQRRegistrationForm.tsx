"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import { fetchPublicRegistrationDepartments, fetchPublicRegistrationState, submitStudentRegistration } from "../api";
import type { PublicRegistrationState, StudentRegistrationDepartment, StudentRegistrationInput, StudentRegistrationResult } from "../api";

function suggestedEmail(first: string, last: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${normalize(first)}${normalize(last)}`;
  return name ? `${name}@example.com` : "";
}

const fieldClass = "w-full rounded-xl border border-hairline bg-card px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export function StudentQRRegistrationForm({ token }: { token: string }) {
  const [state, setState] = useState<PublicRegistrationState | null>(null);
  const [departments, setDepartments] = useState<StudentRegistrationDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailEdited, setEmailEdited] = useState(false);
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<StudentRegistrationResult | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const registrationState = await fetchPublicRegistrationState(token);
      setState(registrationState);
      if (registrationState.status === "active") {
        setDepartments(await fetchPublicRegistrationDepartments(token));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This registration link is not available.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    const data = new FormData(event.currentTarget);
    const input: StudentRegistrationInput = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      gender: String(data.get("gender")) as "male" | "female",
      department_id: Number(data.get("department_id")),
      year_level: Number(data.get("year_level")),
      phone: String(data.get("phone") ?? "").trim(),
      email: email.trim(),
      password: String(data.get("password") ?? ""),
      password_confirmation: String(data.get("password_confirmation") ?? ""),
    };
    try {
      setResult(await submitStudentRegistration(token, input));
      setState((current) => current ? { ...current, status: "used" } : current);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldErrors(caught.errors);
        if (caught.status === 409 || caught.status === 410) void refresh();
      } else setError(caught instanceof Error ? caught.message : "Registration could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  const terminalMessage = state?.status === "used"
    ? "This registration link has already been used. Please ask an administrator for a new QR code."
    : state?.status === "revoked"
      ? "This registration link was revoked by an administrator. Please request a new QR code."
      : state?.status === "expired"
        ? "This registration link has expired. Please request a new QR code." : "";

  return (
    <main className="min-h-screen bg-canvas px-4 py-10 text-ink sm:py-16">
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-hairline bg-card shadow-lift">
        <header className="border-b border-hairline bg-brand-50/60 px-6 py-6 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Smart Attendance</p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Student registration</h1>
          <p className="mt-2 text-sm text-muted">Complete your details to create your student account and join an available class.</p>
        </header>

        <div className="p-6 sm:p-8">
          {loading ? <p role="status" className="py-10 text-center text-sm text-muted">Checking registration link…</p>
            : result ? (
              <div role="status" className="space-y-4">
                <div className="rounded-xl bg-success-soft p-4 text-success">
                  <h2 className="text-lg font-bold">Registration complete</h2>
                  <p className="mt-1 text-sm">{result.student.user?.name} · {result.student.student_code}</p>
                </div>
                <div className="space-y-2 rounded-xl border border-hairline p-4 text-sm">
                  <p><span className="text-muted">Department:</span> {result.student.department?.name}</p>
                  {result.enrollment ? <>
                    <p><span className="text-muted">Course:</span> {result.enrollment.course_name}</p>
                    <p><span className="text-muted">Class section:</span> {result.enrollment.section_code}</p>
                    {result.enrollment.academic_year && <p><span className="text-muted">Academic year:</span> {result.enrollment.academic_year}</p>}
                  </> : <p className="text-danger">Your account was created, but no class enrollment was returned. Please contact the administrator.</p>}
                  {result.section_created && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">A new class section was created and needs administrator setup before classes begin.</p>}
                </div>
                <p className="text-sm text-muted">You can now sign in using the email address and password you created.</p>
              </div>
            ) : terminalMessage ? <div className="rounded-xl border border-hairline bg-canvas p-5 text-center text-sm text-muted">{terminalMessage}</div>
              : state?.status !== "active" ? <div role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{error || "This registration link is unavailable."}</div>
                : <form onSubmit={(event) => void submit(event)} className="space-y-5">
                  {departments.length === 0 && <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">There are no active departments available for registration. Please ask an administrator to activate a department.</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" error={fieldErrors.first_name?.[0]}><input className={fieldClass} autoComplete="given-name" required maxLength={75} placeholder="e.g. Sok" value={firstName} onChange={(event) => { setFirstName(event.target.value); if (!emailEdited) setEmail(suggestedEmail(event.target.value, lastName)); }} /></Field>
                    <Field label="Last name" error={fieldErrors.last_name?.[0]}><input className={fieldClass} autoComplete="family-name" required maxLength={75} placeholder="e.g. Dara" value={lastName} onChange={(event) => { setLastName(event.target.value); if (!emailEdited) setEmail(suggestedEmail(firstName, event.target.value)); }} /></Field>
                  </div>
                  <Field label="Gender" error={fieldErrors.gender?.[0]}><select name="gender" required className={fieldClass} defaultValue=""><option value="" disabled>Select gender</option><option value="male">Male</option><option value="female">Female</option></select></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Department" error={fieldErrors.department_id?.[0]}><select name="department_id" required className={fieldClass} defaultValue=""><option value="" disabled>Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></Field>
                    <Field label="Year level" error={fieldErrors.year_level?.[0]}><select name="year_level" required className={fieldClass} defaultValue=""><option value="" disabled>Select year</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>Year {index + 1}</option>)}</select></Field>
                  </div>
                  <Field label="Phone number" error={fieldErrors.phone?.[0]}><input name="phone" className={fieldClass} autoComplete="tel" required maxLength={30} placeholder="e.g. 012 345 678" /></Field>
                  <Field label="Email address" error={fieldErrors.email?.[0]}><input type="email" autoComplete="email" className={fieldClass} required maxLength={150} placeholder="name@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setEmailEdited(true); }} /><span className="mt-1 block text-xs text-muted">Suggested address uses example.com, which cannot receive email. Replace it with an address you can access.</span></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Create password" error={fieldErrors.password?.[0]}><input name="password" type="password" className={fieldClass} autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" /></Field>
                    <Field label="Confirm password" error={fieldErrors.password_confirmation?.[0]}><input name="password_confirmation" type="password" className={fieldClass} autoComplete="new-password" required minLength={8} placeholder="Re-enter your password" /></Field>
                  </div>
                  {error && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
                  <button type="submit" disabled={submitting || departments.length === 0} className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-600 px-5 font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Creating your account…" : "Register as student"}</button>
                </form>}
        </div>
      </section>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold">{label}<div className="mt-1.5">{children}</div>{error && <span className="mt-1 block text-xs font-normal text-danger">{error}</span>}</label>;
}
