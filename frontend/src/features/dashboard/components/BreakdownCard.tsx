import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export type BreakdownRow = {
  label: string;
  value: number;
  bar: string;
  dot: string;
};

type BreakdownCardProps = {
  title: string;
  total: number;
  rows: BreakdownRow[];
};

export function BreakdownCard({ title, total, rows }: BreakdownCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold">{title}</h3>
        <Badge tone="brand">{total.toLocaleString()} total</Badge>
      </div>
      <div className="mt-5 space-y-4">
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;

          return (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold capitalize">
                  <span className={`size-2 rounded-pill ${row.dot}`} />
                  {row.label}
                </span>
                <span className="font-bold">
                  {row.value.toLocaleString()}
                  <span className="ml-1.5 text-xs font-medium text-muted">
                    {pct}%
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-pill bg-slate-100">
                <div
                  className={`h-full rounded-pill transition-all duration-500 ${row.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
