import { Flame } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { type CategoryBreakdownItem } from "@/modules/dashboard/api";

const FALLBACK_COLOR = "#8B8577";

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

  const total = items.reduce((acc, item) => acc + parseFloat(item.total), 0);
  const top = items[0];
  const topColor = top.color ?? FALLBACK_COLOR;

  return (
    <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-olive">Gastos por categoria (mês atual)</h3>
        <span className="text-xs text-olive">{items.length} categorias</span>
      </div>
      <p className="num text-3xl text-ink dark:text-paper mb-4">{formatCurrency(total)}</p>

      {/* Gargalo: categoria que mais pesa no mês */}
      <div
        className="flex items-center gap-3 rounded-card border p-3 mb-5"
        style={{ borderColor: `${topColor}55`, backgroundColor: `${topColor}14` }}
      >
        <span
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          style={{ backgroundColor: `${topColor}26` }}
        >
          <Flame size={16} style={{ color: topColor }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-olive">Maior gasto — onde está o gargalo</p>
          <p className="text-sm font-medium text-ink dark:text-paper truncate">{top.category_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="num text-base font-semibold text-ink dark:text-paper">{formatCurrency(top.total)}</p>
          <p className="text-xs text-olive">{top.percentage.toFixed(0)}% do total</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {items.map((item, idx) => {
          const color = item.color ?? FALLBACK_COLOR;
          const isTop = idx === 0;
          return (
            <div key={item.category_id ?? item.category_name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-olive/60 w-3.5 shrink-0 tabular-nums">{idx + 1}</span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span
                    className={`truncate text-ink dark:text-paper ${isTop ? "font-semibold" : ""} ${
                      item.is_uncategorized ? "italic text-olive" : ""
                    }`}
                  >
                    {item.category_name}
                  </span>
                  <span className="text-xs text-olive shrink-0">{item.percentage.toFixed(0)}%</span>
                </span>
                <span className={`num text-ink dark:text-paper shrink-0 ${isTop ? "font-semibold" : ""}`}>
                  {formatCurrency(item.total)}
                </span>
              </div>
              <div
                className={`rounded-full bg-ink/5 dark:bg-paper/10 overflow-hidden ml-[22px] ${
                  isTop ? "h-2.5" : "h-1.5"
                }`}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.percentage}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
