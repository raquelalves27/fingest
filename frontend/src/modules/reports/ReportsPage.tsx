import { useEffect, useState } from "react";
import { Download, BarChart3 } from "lucide-react";
import { getReport, downloadExpensesCsv, type Report } from "@/modules/reports/api";
import { Skeleton } from "@/components/shared/Skeleton";
import { Toast, useToast } from "@/components/shared/Toast";
import { formatCurrency } from "@/lib/format";

export function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { message, showToast } = useToast();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setReport(await getReport(12));
      setIsLoading(false);
    }
    load();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadExpensesCsv();
      showToast("Arquivo CSV baixado.");
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading || !report) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const maxNet = Math.max(...report.monthly_evolution.map((p) => Math.abs(parseFloat(p.net))), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-paper">Relatórios</h2>
          <p className="text-sm text-olive mt-1">Sua evolução financeira nos últimos 12 meses.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-card border border-paper-border dark:border-ink-border text-ink dark:text-paper hover:bg-ink/5 dark:hover:bg-paper/5 text-sm font-medium px-4 py-2.5 transition disabled:opacity-60"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
      </div>

      {/* Evolução mensal */}
      <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
        <h3 className="text-sm font-medium text-olive mb-4">Evolução mensal (receitas − despesas)</h3>
        <div className="space-y-2">
          {report.monthly_evolution.map((p) => {
            const net = parseFloat(p.net);
            const widthPct = (Math.abs(net) / maxNet) * 100;
            return (
              <div key={p.label} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-olive flex-shrink-0">{p.label}</span>
                <div className="flex-1 h-5 rounded-full bg-ink/5 dark:bg-paper/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${net >= 0 ? "bg-emerald" : "bg-clay"}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className={`num w-24 text-right flex-shrink-0 ${net >= 0 ? "text-emerald" : "text-clay"}`}>
                  {formatCurrency(net)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gastos por cartão */}
      {report.spending_by_card.length > 0 && (
        <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
          <h3 className="text-sm font-medium text-olive mb-4">Gastos por cartão</h3>
          <div className="space-y-2">
            {report.spending_by_card.map((c) => (
              <div key={c.credit_card_id} className="flex items-center justify-between text-sm">
                <span className="text-ink dark:text-paper">{c.credit_card_name}</span>
                <span className="num text-ink dark:text-paper">{formatCurrency(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gastos por conta */}
      {report.spending_by_account.length > 0 && (
        <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
          <h3 className="text-sm font-medium text-olive mb-4">Gastos por conta</h3>
          <div className="space-y-2">
            {report.spending_by_account.map((a) => (
              <div key={a.account_id} className="flex items-center justify-between text-sm">
                <span className="text-ink dark:text-paper">{a.account_name}</span>
                <span className="num text-ink dark:text-paper">{formatCurrency(a.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.spending_by_card.length === 0 && report.spending_by_account.length === 0 && (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-8 text-center">
          <BarChart3 className="mx-auto text-olive/50 mb-2" size={24} />
          <p className="text-sm text-olive">Ainda não há dados suficientes para esses relatórios.</p>
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
