"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Activity, BarChart3, Clock3, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/Card";

export type TrendRange = "24h" | "7d" | "30d" | "semester";
export type TrendPoint = { label: string; rate: number; checkIns: number };
export type StatusPoint = { status: "present" | "late" | "absent" | "excused"; count: number };
export type DepartmentPoint = { name: string; rate: number };
export type DailyPoint = { label: string; present: number; late: number; absent: number };

type ChartProps = { t: (key: string) => string };

function ChartCard({ title, subtitle, icon: Icon, children, action }: {
  title: string;
  subtitle: string;
  icon: typeof Activity;
  children: ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="h-full min-w-0 overflow-hidden p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-ink sm:text-base">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function AttendanceTrendChart({ t, points, range, onRangeChange, loading }: ChartProps & {
  points: TrendPoint[];
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  loading: boolean;
}) {
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const labels: { id: TrendRange; label: string }[] = [
    { id: "24h", label: t("24h") },
    { id: "7d", label: t("7 Days") },
    { id: "30d", label: t("30 Days") },
    { id: "semester", label: t("Semester") },
  ];
  const width = 760;
  const height = 250;
  const left = 42;
  const right = 12;
  const top = 12;
  const bottom = 30;
  const usableWidth = width - left - right;
  const usableHeight = height - top - bottom;
  const plotted = points;
  const coords = plotted.map((point, index) => ({
    x: left + (plotted.length <= 1 ? usableWidth / 2 : (index / (plotted.length - 1)) * usableWidth),
    y: top + (1 - Math.max(0, Math.min(100, point.rate)) / 100) * usableHeight,
    point,
    originalIndex: points.length === 1 ? 0 : index,
  }));
  const path = coords.reduce((value, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = coords[index - 1];
    const tension = (point.x - previous.x) * 0.4;
    return `${value} C ${previous.x + tension} ${previous.y}, ${point.x - tension} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const area = coords.length ? `${path} L ${coords.at(-1)?.x} ${top + usableHeight} L ${coords[0].x} ${top + usableHeight} Z` : "";
  const selected = activePoint === null ? null : points[activePoint];

  return (
    <ChartCard title={t("Attendance Rate Trend")} subtitle={t("Attendance rate from recorded class sessions.")} icon={Activity}
      action={<div className="flex flex-wrap items-center gap-1 rounded-control bg-canvas p-1" role="group" aria-label={t("Chart timeframe")}>
        {labels.map((item) => <button key={item.id} type="button" aria-pressed={range === item.id} onClick={() => { setActivePoint(null); onRangeChange(item.id); }} className={`min-h-8 rounded-[9px] px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${range === item.id ? "bg-brand-600 text-white shadow-sm" : "text-muted hover:bg-card hover:text-ink"}`}>{item.label}</button>)}
      </div>}>
      {range === "24h" && <div className="mb-3 flex items-center gap-2">
        <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{t("Live")}</span>
      </div>}
      <div className="relative h-[220px] w-full sm:h-[250px]">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="size-full overflow-visible" role="img" aria-label={t("Attendance Rate Trend")}>
          <defs><linearGradient id="attendanceTrendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity=".28" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient></defs>
          {[0, 50, 100].map((value) => { const y = top + (1 - value / 100) * usableHeight; return <g key={value}><line x1={left} x2={width - right} y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-700" strokeDasharray="4 6" /><text x={left - 9} y={y + 4} textAnchor="end" className="fill-slate-500 dark:fill-slate-400" fontSize="11">{value}%</text></g>; })}
          {area && <path d={area} fill="url(#attendanceTrendFill)" />}
          {path && <path d={path} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {coords.map(({ x, y, point, originalIndex }) => <g key={`${point.label}-${originalIndex}`} onMouseEnter={() => setActivePoint(originalIndex)} onMouseLeave={() => setActivePoint(null)} onFocus={() => setActivePoint(originalIndex)} onBlur={() => setActivePoint(null)} tabIndex={0} role="button" aria-label={`${point.label}: ${point.rate.toFixed(1)}%, ${point.checkIns} ${t("check-ins")}`}>
            <circle cx={x} cy={y} r="13" fill="transparent" /><circle cx={x} cy={y} r={activePoint === originalIndex ? 5 : 3.5} fill="#3b82f6" stroke="var(--color-card)" strokeWidth="2" />
            <title>{`${point.label}: ${point.rate.toFixed(1)}% · ${point.checkIns} ${t("check-ins")}`}</title>
          </g>)}
          {coords.filter((_, index) => index === 0 || index === coords.length - 1 || index % Math.ceil(coords.length / 6) === 0).map(({ x, point, originalIndex }) => <text key={`label-${originalIndex}`} x={x} y={height - 4} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" fontSize="10">{point.label}</text>)}
        </svg>
        {selected && <div className="pointer-events-none absolute top-2 right-2 rounded-control border border-hairline bg-card/95 px-3 py-2 text-xs shadow-soft backdrop-blur">
          <p className="font-semibold text-ink">{selected.label}</p><p className="mt-1 text-muted">{t("Attendance rate")}: <b className="text-ink">{selected.rate.toFixed(1)}%</b></p><p className="text-muted">{t("Active check-ins")}: <b className="text-ink">{selected.checkIns.toLocaleString()}</b></p>
        </div>}
        {loading && <div className="absolute inset-0 grid place-items-center rounded-control bg-card/70 text-xs font-medium text-muted backdrop-blur-[1px]">{t("Loading analytics…")}</div>}
        {!loading && points.length === 0 && <div className="absolute inset-0 grid place-items-center rounded-control bg-canvas text-sm text-muted">{t("No attendance data for this period.")}</div>}
      </div>
    </ChartCard>
  );
}

const STATUS_COLORS: Record<StatusPoint["status"], string> = { present: "#10b981", late: "#f59e0b", absent: "#f43f5e", excused: "#8b5cf6" };

export function StatusDonutChart({ t, points, overallRate }: ChartProps & { points: StatusPoint[]; overallRate: number | null }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visibleTotal = points.reduce((sum, item) => sum + (hidden.has(item.status) ? 0 : item.count), 0);
  const circumference = 2 * Math.PI * 37;
  let offset = 0;
  const segments = points.map((item) => {
    const portion = visibleTotal > 0 && !hidden.has(item.status) ? (item.count / visibleTotal) * circumference : 0;
    const segment = { ...item, portion, offset };
    offset += portion;
    return segment;
  });
  return <ChartCard title={t("Attendance Status Breakdown")} subtitle={t("Recorded attendance outcomes for the selected period.")} icon={BarChart3}>
    <div className="grid items-center gap-5 sm:grid-cols-[minmax(150px,190px)_1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-[190px]">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={t("Attendance Status Breakdown")}>
          <circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-800" />
          {segments.map((segment) => <circle key={segment.status} cx="50" cy="50" r="37" fill="none" stroke={STATUS_COLORS[segment.status]} strokeWidth="12" strokeDasharray={`${segment.portion} ${circumference - segment.portion}`} strokeDashoffset={-segment.offset} className="transition-all duration-300" />)}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-display text-2xl font-extrabold tabular-nums">{overallRate === null ? "—" : `${overallRate.toFixed(0)}%`}</span><span className="mt-0.5 text-[10px] font-medium text-muted">{t("Attendance rate")}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {segments.map((item) => {
          const selected = !hidden.has(item.status);
          const pct = visibleTotal > 0 ? Math.round((selected ? item.count : 0) / visibleTotal * 100) : 0;
          return <button key={item.status} type="button" aria-pressed={selected} onClick={() => setHidden((previous) => { const next = new Set(previous); selected ? next.add(item.status) : next.delete(item.status); return next; })} className={`min-h-16 rounded-control border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${selected ? "border-hairline bg-canvas" : "border-transparent bg-canvas/50 opacity-50"}`}>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted"><span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] }} />{t(item.status[0].toUpperCase() + item.status.slice(1))}</span>
            <span className="mt-1 block text-sm font-bold tabular-nums">{item.count.toLocaleString()} <span className="text-[10px] font-medium text-muted">{pct}%</span></span>
          </button>;
        })}
      </div>
    </div>
  </ChartCard>;
}

export function DepartmentBarChart({ t, points }: ChartProps & { points: DepartmentPoint[] }) {
  const sorted = useMemo(() => [...points].sort((a, b) => b.rate - a.rate).slice(0, 8), [points]);
  return <ChartCard title={t("Attendance by Department")} subtitle={t("Average attendance rate across departments.")} icon={UsersRound}>
    <div className="space-y-4">
      {sorted.map((point) => {
        const color = point.rate >= 90 ? "#10b981" : point.rate >= 80 ? "#3b82f6" : "#f59e0b";
        return <div key={point.name} className="grid grid-cols-[minmax(0,1fr)_48px] items-center gap-x-3 gap-y-1.5" title={`${point.name}: ${point.rate.toFixed(1)}%`}>
          <span className="truncate text-xs font-semibold text-ink">{point.name}</span><span className="text-right text-xs font-bold tabular-nums text-muted">{point.rate.toFixed(0)}%</span>
          <div className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, point.rate))}%`, backgroundColor: color }} /></div>
        </div>;
      })}
      {sorted.length === 0 && <div className="grid min-h-40 place-items-center rounded-control bg-canvas px-4 text-center text-sm text-muted">{t("No department attendance data for this period.")}</div>}
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-hairline pt-3 text-[10px] font-medium text-muted">
        {[ ["#10b981", t("90% and above")], ["#3b82f6", t("80% to 89%")], ["#f59e0b", t("Below 80%") ] ].map(([color, label]) => <span key={label} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}
      </div>
    </div>
  </ChartCard>;
}

const VOLUME_SERIES = [
  { key: "present" as const, color: "#10b981" },
  { key: "late" as const, color: "#f59e0b" },
  { key: "absent" as const, color: "#f43f5e" },
];

export function DailyVolumeChart({ t, points }: ChartProps & { points: DailyPoint[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [activeDay, setActiveDay] = useState<DailyPoint | null>(null);
  const max = Math.max(1, ...points.map((point) => VOLUME_SERIES.reduce((sum, series) => sum + (hidden.has(series.key) ? 0 : point[series.key]), 0)));
  const width = 560; const height = 240; const left = 16; const bottom = 34; const top = 8; const innerHeight = height - bottom - top;
  return <ChartCard title={t("Daily Check-in Volume")} subtitle={t("Present, late, and absent records by day.")} icon={Clock3}>
    <div className="mb-4 flex flex-wrap gap-2">
      {VOLUME_SERIES.map((series) => {
        const enabled = !hidden.has(series.key);
        return <button key={series.key} type="button" aria-pressed={enabled} onClick={() => setHidden((previous) => { const next = new Set(previous); enabled ? next.add(series.key) : next.delete(series.key); return next; })} className={`flex min-h-8 items-center gap-1.5 rounded-pill border px-2.5 text-[11px] font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${enabled ? "border-hairline bg-canvas text-ink" : "border-transparent bg-canvas text-muted opacity-50"}`}><span className="size-2 rounded-full" style={{ backgroundColor: series.color }} />{t(series.key[0].toUpperCase() + series.key.slice(1))}</button>;
      })}
    </div>
    <div className="h-[230px] w-full">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="size-full" role="img" aria-label={t("Daily Check-in Volume")}>
        {[0, 0.5, 1].map((fraction) => { const y = top + (1 - fraction) * innerHeight; return <g key={fraction}><line x1={left} x2={width - left} y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-700" strokeDasharray="4 6" /><text x={left - 2} y={y - 4} textAnchor="start" className="fill-slate-500 dark:fill-slate-400" fontSize="10">{Math.round(max * fraction)}</text></g>; })}
        {points.map((point, index) => {
          const slot = (width - left * 2) / Math.max(1, points.length); const barWidth = Math.min(34, slot * 0.52); const x = left + index * slot + (slot - barWidth) / 2; let stackY = top + innerHeight;
          const topSeries = [...VOLUME_SERIES].reverse().find((series) => !hidden.has(series.key))?.key;
          const bars = VOLUME_SERIES.map((series) => {
            const value = hidden.has(series.key) ? 0 : point[series.key];
            const barHeight = (value / max) * innerHeight;
            stackY -= barHeight;
            const y = stackY;
            const bar = series.key === topSeries
              ? <path d={`M ${x + 4} ${y} H ${x + barWidth - 4} Q ${x + barWidth} ${y} ${x + barWidth} ${y + 4} V ${y + barHeight} H ${x} V ${y + 4} Q ${x} ${y} ${x + 4} ${y} Z`} fill={series.color} />
              : <rect x={x} y={y} width={barWidth} height={Math.max(0, barHeight)} fill={series.color} />;
            return <g key={series.key} onMouseEnter={() => setActiveDay(point)} onMouseLeave={() => setActiveDay(null)} onFocus={() => setActiveDay(point)} onBlur={() => setActiveDay(null)} tabIndex={0} role="button" aria-label={`${point.label}: ${t(series.key[0].toUpperCase() + series.key.slice(1))} ${value}`}>
              {bar}
              <title>{`${point.label} · ${t(series.key[0].toUpperCase() + series.key.slice(1))}: ${point[series.key]}`}</title>
            </g>;
          });
          return <g key={point.label}>{bars}<text x={x + barWidth / 2} y={height - 8} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" fontSize="10">{point.label}</text></g>;
        })}
      </svg>
      {activeDay && <div className="pointer-events-none absolute top-0 right-2 rounded-control border border-hairline bg-card/95 px-3 py-2 text-xs shadow-soft backdrop-blur">
        <p className="mb-1 font-semibold text-ink">{activeDay.label}</p>
        {VOLUME_SERIES.filter((series) => !hidden.has(series.key)).map((series) => <p key={series.key} className="text-muted">{t(series.key[0].toUpperCase() + series.key.slice(1))}: <b className="text-ink">{activeDay[series.key]}</b></p>)}
      </div>}
      {points.length === 0 && <div className="grid min-h-32 place-items-center text-sm text-muted">{t("No attendance data for this period.")}</div>}
    </div>
  </ChartCard>;
}
