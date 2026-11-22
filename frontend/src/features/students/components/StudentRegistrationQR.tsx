
"use client";

import { useLocale } from "@/i18n/LocaleProvider";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  Check,
  ExternalLink,
  QrCode,
  RefreshCw,
  X,
  Ban,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { fetchStudentRegistrationLink, revokeStudentRegistrationLink } from "../api";

export type RegistrationLink = {
  id: number;
  url: string;
  expires_at: string;
  status: "active" | "used" | "revoked" | "expired";
};

type Props = {
  open: boolean;
  onClose: () => void;
  onGenerate: () => Promise<RegistrationLink>;
  onRegistered?: () => void;
};

export function StudentRegistrationQR({
  open,
  onClose,
  onGenerate,
  onRegistered,
}: Props) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [registration, setRegistration] =
    useState<RegistrationLink | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [status, setStatus] = useState<RegistrationLink["status"]>("active");
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !registration || status !== "active") return;
    let disposed = false;
    const poll = async () => {
      try {
        const result = await fetchStudentRegistrationLink(registration.id);
        if (disposed) return;
        setStatus(result.status);
        if (result.status === "used") onRegistered?.();
      } catch {
        // Keep the issued QR visible if a temporary status check fails.
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 5000);
    return () => { disposed = true; window.clearInterval(interval); };
  }, [onRegistered, open, registration, status]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setRegistration(null);
      setStatus("active");
      setError("");
      setCopied(false);
    }
  }, [open]);

  const expired = registration
    ? now >= new Date(registration.expires_at).getTime()
    : false;

  const validExpiry =
    registration &&
    Number.isFinite(
      new Date(registration.expires_at).getTime()
    );

  const secondsRemaining =
    registration && validExpiry
      ? Math.max(
          0,
          Math.ceil(
            (new Date(registration.expires_at).getTime() -
              now) /
              1000
          )
        )
      : 0;

  const displayTime = `${Math.floor(
    secondsRemaining / 60
  )}:${String(secondsRemaining % 60).padStart(2, "0")}`;

  async function generate() {
    if (loading) return;

    setLoading(true);
    setError("");
    setRegistration(null);
    setCopied(false);

    try {
      const result = await onGenerate();

      if (
        !result.url ||
        !Number.isFinite(
          new Date(result.expires_at).getTime()
        )
      ) {
        throw new Error("Invalid registration link response.");
      }

      setNow(Date.now());
      setRegistration(result);
      setStatus(result.status);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not generate registration QR."
      );
    } finally {
      setLoading(false);
    }
  }

  async function revoke() {
    if (!registration || revoking) return;
    setRevoking(true);
    setError("");
    try {
      const result = await revokeStudentRegistrationLink(registration.id);
      setStatus(result.status);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not revoke this link.");
    } finally {
      setRevoking(false);
    }
  }

  async function copyLink() {
    if (!registration || expired) return;

    try {
      await navigator.clipboard.writeText(registration.url);
      setCopied(true);
    } catch {
      setError("Could not copy the registration link.");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="registration-qr-title"
      onCancel={(event) => {
        if (loading) {
          event.preventDefault();
        } else {
          onClose();
        }
      }}
      onClose={onClose}
      className="
        m-auto w-[min(92vw,28rem)]
        rounded-panel border border-hairline
        bg-card p-0 text-ink shadow-lift
        backdrop:bg-ink/60
      "
    >
      <div className="border-b border-hairline p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="registration-qr-title"
              className="font-display text-lg font-bold"
            >{t("Student QR Registration")}</h2>
            <p className="mt-1 text-sm text-muted">{t("Generate a one-time student registration link.")}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={t("Close registration dialog")}
            className="rounded-control p-2 text-muted hover:bg-canvas"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {registration && !expired && status === "active" ? (
          <>
            <div className="flex justify-center">
              <div className="rounded-2xl bg-white p-5">
                <QRCodeSVG
                  value={registration.url}
                  title={t("One-time student registration QR code")}
                  size={220}
                  level="H"
                  marginSize={0}
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold">{t("Scan to register")}</p>
              <p className="mt-1 text-xs text-muted">{t("One successful registration per QR code")}</p>
              <p className="mt-2 text-xs font-medium text-brand-600">
                Expires in {displayTime}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => void copyLink()}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() =>
                  window.open(
                    registration.url,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                <ExternalLink className="size-4" />{t("Open form")}</Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="rounded-2xl bg-brand-50 p-5 text-brand-600">
              <QrCode className="size-12" />
            </div>

            <p className="text-sm font-semibold">
              {status === "used" ? "Registration link already used" : status === "revoked" ? "Registration link revoked" : expired || status === "expired"
                ? "Registration QR expired"
                : "Ready to generate QR"}
            </p>

            <p className="max-w-xs text-xs leading-relaxed text-muted">
              {status === "used" ? "A student has completed this registration. Generate a new QR for another student." : status === "revoked" ? "This link was revoked. Generate a new QR to continue." : expired || status === "expired"
                ? "Generate a new link to continue student registration."
                : "Create a secure registration link for one student. The link expires after a limited time."}
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {registration && status === "active" && !expired && (
          <Button type="button" variant="danger" className="w-full" disabled={revoking} loading={revoking} onClick={() => void revoke()}>
            <Ban className="size-4" />{t("Revoke registration link")}</Button>
        )}

        <Button
          type="button"
          variant={registration && !expired
            ? "secondary"
            : "primary"}
          className="w-full"
          disabled={loading}
          loading={loading}
          onClick={() => void generate()}
        >
          <RefreshCw className="size-4" />
          {registration && status === "active" && !expired
            ? "Generate New QR"
            : "Generate Registration QR"}
        </Button>
      </div>
    </dialog>
  );
}
