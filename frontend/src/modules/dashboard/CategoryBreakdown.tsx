import { formatCurrency } from "@/lib/format";
import { type CategoryBreakdownItem } from "@/modules/dashboard/api";

export function CategoryBreakdown({ items }: { items: CategoryBreakdownItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
        <h3 className="text-sm font-medium text-olive mb-2">Gastos por categoria</h3>
        <p className="text-sm text-olive/70 py-6 text-center">
          Nenhuma despesa categorizada este mês ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
      <h3 className="text-sm font-medium text-olive mb-4">Gastos por categoria (mês atual)</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.category_id ?? item.category_name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color ?? "#8B8577" }}
                />
                {item.category_name}
              </span>
              <span className="num text-ink dark:text-paper">{formatCurrency(item.total)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-ink/5 dark:bg-paper/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${item.percentage}%`, backgroundColor: item.color ?? "#8B8577" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
