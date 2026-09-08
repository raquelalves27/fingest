import { useEffect, useState } from "react";
import { PiggyBank, AlertTriangle } from "lucide-react";
import { getBudget, setBudget, type Budget } from "@/modules/budget/api";
import { useFormOptions } from "@/modules/transactions/useFormOptions";
import { Skeleton } from "@/components/shared/Skeleton";
import { Toast, useToast } from "@/components/shared/Toast";
import { formatCurrency } from "@/lib/format";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function BudgetPage() {
  const { categories } = useFormOptions();
  const today = new Date();
  const [month] = useState(today.getMonth() + 1);
  const [year] = useState(today.getFullYear());
  const [budget, setBudgetState] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draftAmounts, setDraftAmounts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { message, showToast } = useToast();

  async function load() {
    setIsLoading(true);
    const data = await getBudget(month, year);
    setBudgetState(data);
    const draft: Record<string, string> = {};
    data.categories.forEach((c) => { draft[c.category_id] = c.planned_amount; });
    setDraftAmounts(draft);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expenseCategories = categories.filter((c) => c.type === "expense" && !c.parent_id);

  async function handleSave() {
    setIsSaving(true);
    try {
      const payloadCategories = Object.entries(draftAmounts)
        .filter(([, value]) => value && parseFloat(value.replace(",", ".")) > 0)
        .map(([category_id, value]) => ({
          category_id,
          planned_amount: value.replace(/\./g, "").replace(",", "."),
        }));
      const updated = await setBudget({ reference_month: month, reference_year: year, categories: payloadCategories });
      setBudgetState(updated);
      showToast("Orçamento salvo com sucesso.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ink dark:text-paper">Orçamento</h2>
        <p className="text-sm text-olive mt-1">{MONTH_NAMES[month - 1]} de {year}</p>
      </div>

      {expenseCategories.length === 0 ? (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
          <PiggyBank className="mx-auto text-olive/50 mb-3" size={32} />
          <p className="text-olive">Crie categorias de despesa primeiro para orçá-las.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenseCategories.map((cat) => {
            const result = budget?.categories.find((c) => c.category_id === cat.id);
            const planned = draftAmounts[cat.id] || "";
            const spent = result ? parseFloat(result.spent_amount) : 0;
            const plannedNum = parseFloat((planned || "0").replace(",", "."));
            const pct = plannedNum > 0 ? Math.min(100, (spent / plannedNum) * 100) : 0;
            const isOver = plannedNum > 0 && spent > plannedNum;

            return (
              <div key={cat.id} className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color ?? "#8B8577" }} />
                    <span className="text-sm font-medium text-ink dark:text-paper">{cat.name}</span>
                    {isOver && <AlertTriangle size={14} className="text-clay" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-olive">R$</span>
                    <input
                      value={planned}
                      onChange={(e) => setDraftAmounts((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="w-24 rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-2.5 py-1.5 text-sm text-right outline-none focus:ring-2 focus:ring-emerald transition"
                    />
                  </div>
                </div>

                {plannedNum > 0 && (
                  <>
                    <div className="h-1.5 rounded-full bg-ink/5 dark:bg-paper/10 overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full ${isOver ? "bg-clay" : "bg-emerald"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-olive">
                      <span>Gasto: {formatCurrency(spent)}</span>
                      <span className={isOver ? "text-clay font-medium" : ""}>
                        {isOver ? "Orçamento estourado" : `Disponível: ${formatCurrency(plannedNum - spent)}`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-card bg-emerald hover:bg-emerald-deep text-white text-sm font-medium py-2.5 transition disabled:opacity-60"
          >
            {isSaving ? "Salvando…" : "Salvar orçamento"}
          </button>
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
