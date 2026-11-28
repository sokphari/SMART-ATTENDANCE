import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type StatCardProps = {
  icon: LucideIcon;
  iconTone: "blue" | "emerald" | "indigo" | "violet" | "amber";
  label: string;
  value: number;
  hint: string;
  trend?: number;
  t: (key: string) => string;
};

const iconToneClass = {
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
} as const;

export function StatCard({ icon: Icon, iconTone, label, value, hint, trend, t }: StatCardProps) {
  return (
    <Card className="p-5 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <span className={`flex size-10 items-center justify-center rounded-control ${iconToneClass[iconTone]}`}>
          <Icon className="size-5" />
        </span>
        {trend !== undefined && trend > 0 && (
          <Badge tone="success">+{trend.toLocaleString()} · {t("30d")}</Badge>
        )}
      </div>
      <p className="font-display mt-4 text-3xl font-extrabold tracking-tight">
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-sm font-bold text-ink/80">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-muted">{hint}</p>
    </Card>
  );
}
