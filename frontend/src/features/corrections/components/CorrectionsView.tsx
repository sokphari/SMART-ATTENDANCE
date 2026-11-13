"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  FileCheck2,
  FilePenLine,
  FileX2,
  MessageSquare,
  Search,
  User,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchCorrections, reviewCorrection } from "../api";
import type { AttendanceCorrection } from "../types";

export function CorrectionsView() {
  const [items, setItems] = useState<AttendanceCorrection[]>([]);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "rejected">(
    "approved",
  );
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    kind: "success" | "error";
  } | null>(null);

  const loadCorrections = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (status) params.set("status", status);

    try {
      const result = await fetchCorrections(params);
      setItems(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load correction requests.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void loadCorrections();
  }, [loadCorrections]);

  async function handleReviewSubmit() {
    if (!reviewingId) return;
    setSubmitting(true);
    try {
      const result = await reviewCorrection(reviewingId, {
        status: reviewDecision,
        review_note: reviewNote.trim() || undefined,
      });

      setItems((prev) =>
        prev.map((c) => (c.id === reviewingId ? result.data : c)),
      );

      setFeedback({
        message: `Correction marked as ${reviewDecision}.`,
        kind: "success",
      });
      setReviewingId(null);
      setReviewNote("");
    } catch (caught) {
      setFeedback({
        message:
          caught instanceof ApiError
            ? caught.message
            : "Failed to submit review.",
        kind: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Attendance Corrections"
        description="Review and audit manual status changes requested by staff or students."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex min-h-24 items-center gap-4 p-4">
          <span className="rounded-panel bg-amber-50 p-2.5 text-amber-600">
            <Clock className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Pending decisions</p>
            <p className="font-display mt-0.5 text-xl font-bold">
              {status === "pending" ? total : "—"}
            </p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-4 p-4">
          <span className="rounded-panel bg-success-soft p-2.5 text-success">
            <FileCheck2 className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Approved requests</p>
            <p className="font-display mt-0.5 text-xl font-bold">
              {status === "approved" ? total : "—"}
            </p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-4 p-4">
          <span className="rounded-panel bg-danger-soft p-2.5 text-danger">
            <FileX2 className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Rejected requests</p>
            <p className="font-display mt-0.5 text-xl font-bold">
              {status === "rejected" ? total : "—"}
            </p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex border-b border-hairline p-3">
          <div className="flex gap-2">
            {(["pending", "approved", "rejected", ""] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`rounded-control px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  status === s
                    ? "bg-brand-600 text-white"
                    : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="m-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}

        {feedback && (
          <div
            className="pointer-events-none fixed top-20 right-4 z-[100] w-[min(24rem,calc(100vw-2rem))] animate-fade-up"
            role={feedback.kind === "error" ? "alert" : "status"}
          >
            <div
              className={`pointer-events-auto flex items-start gap-3 rounded-panel border bg-card p-4 shadow-lift ${
                feedback.kind === "success"
                  ? "border-success/30"
                  : "border-danger/30"
              }`}
            >
              <span
                className={
                  feedback.kind === "success"
                    ? "mt-0.5 text-success"
                    : "mt-0.5 text-danger"
                }
              >
                {feedback.kind === "success" ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <AlertCircle className="size-5" />
                )}
              </span>
              <p className="flex-1 text-sm font-semibold text-ink">
                {feedback.message}
              </p>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="rounded-control p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Student & Course</th>
                <th className="px-5 py-3">Requested Change</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Requested By</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action / Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    Loading correction requests…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    No correction requests found for this filter.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-canvas/70"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-semibold text-ink">
                          {row.attendance?.student?.user?.name ?? "Student"}
                        </span>
                        <div className="text-xs text-muted">
                          {row.attendance?.student?.student_code} ·{" "}
                          {row.attendance?.session?.class_section?.course
                            ?.course_code ?? ""}{" "}
                          (Sec{" "}
                          {row.attendance?.session?.class_section
                            ?.section_code ?? ""}
                          )
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted line-through">
                          {row.attendance?.status}
                        </span>
                        <span className="text-xs text-muted">→</span>
                        <Badge tone="brand">{row.requested_status}</Badge>
                      </div>
                    </td>
                    <td className="max-w-xs px-5 py-4 text-xs text-ink">
                      <p className="truncate font-medium">{row.reason}</p>
                      {row.review_note && (
                        <p className="mt-0.5 text-[11px] text-muted italic">
                          Reviewer note: {row.review_note}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">
                      {row.requester?.name ?? "Staff"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        tone={
                          row.status === "approved"
                            ? "success"
                            : row.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.status === "pending" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setReviewingId(row.id);
                              setReviewDecision("approved");
                              setReviewNote("");
                            }}
                          >
                            <Check className="size-3.5 text-success" />
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setReviewingId(row.id);
                              setReviewDecision("rejected");
                              setReviewNote("");
                            }}
                          >
                            <X className="size-3.5 text-danger" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">
                          {row.reviewer?.name
                            ? `Reviewed by ${row.reviewer.name}`
                            : "Processed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted">
          <span>
            Showing {items.length ? (page - 1) * 10 + 1 : 0}–
            {Math.min(page * 10, total)} of {total} requests
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Review Modal */}
      {reviewingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-panel border border-hairline bg-card p-6 shadow-lift animate-fade-up">
            <h3 className="font-display text-lg font-bold text-ink">
              {reviewDecision === "approved" ? "Approve" : "Reject"} Correction
            </h3>
            <p className="mt-1 text-xs text-muted">
              {reviewDecision === "approved"
                ? "This will adjust the student's attendance record and record a manual audit log entry."
                : "This request will be marked as rejected and the attendance record will remain unchanged."}
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-ink">
                Review Note (Optional)
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. Verified with medical certificate..."
                  className="mt-1 w-full rounded-control border border-hairline bg-card p-2.5 text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReviewingId(null)}
              >
                Cancel
              </Button>
              <Button
                variant={reviewDecision === "approved" ? "primary" : "danger"}
                size="sm"
                loading={submitting}
                onClick={handleReviewSubmit}
              >
                Confirm {reviewDecision === "approved" ? "Approval" : "Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
