import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { getPayables, getReceivables, type PayableSummary, type ReceivableSummary } from "@/modules/payables/api";
import { Skeleton } from "@/components/shared/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";

type Tab = "payable" | "receivable";

export function PayablesPage() {
  const [tab, setTab] = useState<Tab>("payable");
  const [payables, setPayables] = useState<PayableSummary | null>(null);
  const [receivables, setReceivables] = useState<ReceivableSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [p, r] = await Promise.all([getPayables(), getReceivables()]);
      setPayables(p);
      setReceivables(r);
      setIsLoading(false);
    }
    load();
  }, []);

  const current = tab === "payable" ? payables : receivables;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ink dark:text-paper">Contas a pagar e receber</h2>
        <p className="text-sm text-olive mt-1">O que está vencido, vence hoje e vence em breve.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab("payable")}
          className={`rounded-card py-2.5 text-sm font-medium border transition ${
            tab === "payable" ? "border-clay bg-clay/10 text-clay" : "border-paper-border dark:border-ink-border text-olive"
          }`}
        >
          A pagar
        </button>
        <button
          onClick={() => setTab("receivable")}
          className={`rounded-card py-2.5 text-sm font-medium border transition ${
            tab === "receivable" ? "border-emerald bg-emerald/10 text-emerald" : "border-paper-border dark:border-ink-border text-olive"
          }`}
        >
          A receber
        </button>
      </div>

      {isLoading || !current ? (
        <div className="space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-card border border-clay/30 bg-clay/5 p-4">
              <p className="text-xs text-olive">Vencidas</p>
              <p className="num text-lg text-clay">{formatCurrency(current.overdue_total)}</p>
            </div>
            <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-4">
              <p className="text-xs text-olive">Hoje</p>
              <p className="num text-lg text-ink dark:text-paper">{formatCurrency(current.due_today_total)}</p>
            </div>
            <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-4">
              <p className="text-xs text-olive">Próx. 30 dias</p>
              <p className="num text-lg text-ink dark:text-paper">{formatCurrency(current.due_next_30_days_total)}</p>
            </div>
          </div>

          {current.overdue.length === 0 && current.due_today.length === 0 && current.upcoming.length === 0 ? (
            <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
              <CalendarClock className="mx-auto text-olive/50 mb-3" size={32} />
              <p className="text-olive">Nada pendente por aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {current.overdue.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-clay mb-2">Vencidas</h3>
                  <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 divide-y divide-paper-border dark:divide-ink-border shadow-soft">
                    {current.overdue.map((item: any) => (
                      <PayableRow key={item.id} item={item} tab={tab} />
                    ))}
                  </div>
                </div>
              )}
              {current.due_today.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-olive mb-2">Hoje</h3>
                  <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 divide-y divide-paper-border dark:divide-ink-border shadow-soft">
                    {current.due_today.map((item: any) => (
                      <PayableRow key={item.id} item={item} tab={tab} />
                    ))}
                  </div>
                </div>
              )}
              {current.upcoming.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-olive mb-2">Próximas</h3>
                  <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 divide-y divide-paper-border dark:divide-ink-border shadow-soft">
                    {current.upcoming.map((item: any) => (
                      <PayableRow key={item.id} item={item} tab={tab} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PayableRow({ item, tab }: { item: any; tab: Tab }) {
  const date = tab === "payable" ? item.expense_date : item.income_date;
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-ink dark:text-paper">{item.description}</p>
        <p className="text-xs text-olive">{formatDate(date)}</p>
      </div>
      <span className={`num text-sm font-medium ${tab === "receivable" ? "text-emerald" : "text-ink dark:text-paper"}`}>
        {formatCurrency(item.amount)}
      </span>
    </div>
  );
}
