"use client";

import { cx } from "@/lib/utils/cx";
import { useBranding } from "@/components/branding/BrandingProvider";

type BrandIconProps = {
  size?: number;
  variant?: "full" | "monogram";
  className?: string;
};

export function BrandIcon({ size = 40, variant = "full", className }: BrandIconProps) {
  const { branding } = useBranding();
  if (branding.logo_url && variant === "full") {
    return <img src={branding.logo_url} alt="" width={size} height={size} className={cx("shrink-0 rounded-[28%] object-contain", className)} />;
  }
  if (variant === "monogram") {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className={className}>
        <rect width="64" height="64" rx="18" fill="#0F172A" />
        <path d="M29 18h-6c-8 0-13 5-13 14s5 14 13 14c5 0 9-2 11-6l-7-4c-1 2-2 3-4 3-3 0-5-3-5-7s2-7 5-7h6v-7Z" fill="#2563EB" />
        <path d="M38 18h13v7h-7v4h6v7h-6v10h-8V18Z" fill="#fff" />
        <path d="m39 40 5 5 11-13" fill="none" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className={className}>
      <rect width="64" height="64" rx="18" fill="#2563EB" />
      {/* Graduation cap */}
      <path d="m32 8 21 9-21 9-21-9 21-9Z" fill="#fff" />
      <path d="m19 22 13 6 13-6v5c0 5-6 9-13 9s-13-4-13-9v-5Z" fill="#fff" />
      <path d="M51 18v8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="51" cy="28" r="2.5" fill="#fff" />
      {/* QR finder marks and pixels */}
      <path d="M9 39v-5a3 3 0 0 1 3-3h5m38 0h-5a3 3 0 0 0-3 3v5M9 45v5a3 3 0 0 0 3 3h5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect x="12" y="37" width="5" height="5" rx="1" fill="#fff" />
      <rect x="22" y="39" width="4" height="4" rx="1" fill="#fff" />
      <rect x="30" y="38" width="4" height="4" rx="1" fill="#fff" />
      <rect x="21" y="47" width="4" height="4" rx="1" fill="#fff" />
      <rect x="29" y="47" width="4" height="4" rx="1" fill="#fff" />
      {/* Attendance confirmation */}
      <circle cx="47" cy="47" r="11" fill="#22C55E" stroke="#fff" strokeWidth="2" />
      <path d="m42 47 3.5 3.5 7-8" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type BrandLogoProps = {
  className?: string;
  iconSize?: number;
  showKhmer?: boolean;
  inverse?: boolean;
  centered?: boolean;
};

export function BrandLogo({ className, iconSize = 40, showKhmer = true, inverse = false, centered = false }: BrandLogoProps) {
  const { branding } = useBranding();
  const name = branding.system_name.trim().split(/\s+/);
  const accent = name.pop();
  return (
    <span className={cx("inline-flex min-w-0 items-center gap-2.5", centered && "justify-center", className)} aria-label={`${branding.system_name} · ប្រព័ន្ធគ្រប់គ្រងវត្តមានឆ្លាតវៃ`}>
      <BrandIcon size={iconSize} className="shrink-0" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cx("whitespace-nowrap font-display text-[15px] font-extrabold tracking-tight", inverse ? "text-white" : "text-slate-950 dark:text-white")}>
          {name.length ? <>{name.join(" ")} </> : null}<span className={inverse ? "text-blue-200" : "text-brand-600"}>{accent}</span>
        </span>
        {showKhmer && <span lang="km" className={cx("mt-0.5 whitespace-nowrap text-[10px] font-medium", inverse ? "text-white/75" : "text-muted")}>
          ប្រព័ន្ធគ្រប់គ្រងវត្តមានឆ្លាតវៃ
        </span>}
      </span>
    </span>
  );
}
