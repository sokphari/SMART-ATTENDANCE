"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchSystemBranding, type SystemBranding } from "@/lib/api/branding";

const DEFAULT_BRANDING: SystemBranding = {
  system_name: "Smart Attendance",
  logo_url: null,
  primary_color: "#2563EB",
};

type BrandingContextValue = {
  branding: SystemBranding;
  updateBranding: (next: SystemBranding) => void;
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  updateBranding: () => {},
});

function mix(hex: string, target: number, amount: number) {
  const channel = (index: number) => {
    const current = parseInt(hex.slice(index, index + 2), 16);
    return Math.round(current + (target - current) * amount).toString(16).padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

function applyBranding(branding: SystemBranding, previousName: string) {
  const root = document.documentElement;
  const color = /^#[0-9a-f]{6}$/i.test(branding.primary_color) ? branding.primary_color : DEFAULT_BRANDING.primary_color;
  const shades: Record<string, string> = {
    "50": mix(color, 255, 0.94),
    "100": mix(color, 255, 0.86),
    "200": mix(color, 255, 0.70),
    "300": mix(color, 255, 0.52),
    "400": mix(color, 255, 0.30),
    "500": mix(color, 255, 0.12),
    "600": color,
    "700": mix(color, 0, 0.17),
    "800": mix(color, 0, 0.33),
    "900": mix(color, 0, 0.48),
  };
  Object.entries(shades).forEach(([shade, value]) => root.style.setProperty(`--color-brand-${shade}`, value));
  root.style.setProperty("--color-brand", color);
  document.title = document.title.replaceAll(previousName, branding.system_name);
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const currentName = useRef(DEFAULT_BRANDING.system_name);

  const updateBranding = useCallback((next: SystemBranding) => {
    setBranding(next);
    const previousName = currentName.current;
    currentName.current = next.system_name;
    try { window.localStorage.setItem("sa_branding", JSON.stringify(next)); } catch {}
    applyBranding(next, previousName);
  }, []);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem("sa_branding");
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<SystemBranding>;
        if (typeof parsed.system_name === "string" && typeof parsed.primary_color === "string") {
          updateBranding({ ...DEFAULT_BRANDING, ...parsed });
        }
      }
    } catch {}
    fetchSystemBranding().then(({ data }) => updateBranding(data)).catch(() => {});
  }, [updateBranding]);

  const value = useMemo(() => ({ branding, updateBranding }), [branding, updateBranding]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
