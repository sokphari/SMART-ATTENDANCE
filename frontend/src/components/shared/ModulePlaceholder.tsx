import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { findNavItem } from "@/config/nav";

export function ModulePlaceholder({ href }: { href: string }) {
  const item = findNavItem(href);

  if (!item) return null;

  const Icon = item.icon;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={item.label}
        description={item.description}
        actions={<Badge tone="brand">Coming soon</Badge>}
      />
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-300" />
        <EmptyState
          icon={Icon}
          title={`The ${item.label.toLowerCase()} workspace is on its way`}
          description="This route is wired to the shell and ready for data tables, filters, and bulk actions."
        >
          {item.endpoint && (
            <code className="rounded-control bg-brand-50 px-3.5 py-2 font-mono text-xs font-bold text-brand-700">
              {item.endpoint}
            </code>
          )}
        </EmptyState>
      </Card>
    </div>
  );
}
