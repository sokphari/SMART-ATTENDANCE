import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  trend?: number;
};

export function StatCard({ icon: Icon, label, value, hint, trend }: StatCardProps) {
  return (
    <Card className="p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className="flex size-10 items-center justify-center rounded-control bg-brand-50 text-brand-600">
          <Icon className="size-5" />
        </span>
        {trend !== undefined && trend > 0 && (
          <Badge tone="success">+{trend.toLocaleString()} · 30d</Badge>
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
