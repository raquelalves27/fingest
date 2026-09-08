import { useEffect, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSummary, getCashFlow, getCategoryBreakdown,
  type DashboardSummary, type CashFlowPoint, type CategoryBreakdownItem
} from "@/modules/dashboard/api";
import { getInsights, type Insight } from "@/modules/insights/api";
import { SummaryCard } from "@/modules/dashboard/SummaryCard";
import { CashFlowChart } from "@/modules/dashboard/CashFlowChart";
import { CategoryBreakdown } from "@/modules/dashboard/CategoryBreakdown";
import { InsightsSection } from "@/modules/insights/InsightsSection";
import { Skeleton } from "@/components/shared/Skeleton";

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowPoint[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [s, cf, cb, ins] = await Promise.all([
        getSummary(), getCashFlow(), getCategoryBreakdown(), getInsights(),
      ]);
      setSummary(s);
      setCashFlow(cf);
      setBreakdown(cb);
      setInsights(ins);
      setIsLoading(false);
    }
    load();
  }, []);

  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ink dark:text-paper">
          Olá, {firstName ?? "de novo"}.
        </h2>
        <p className="text-sm text-olive mt-1">Aqui está o resumo da sua vida financeira.</p>
      </div>

      {isLoading || !summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 md:col-span-2" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="Saldo total"
            value={summary.total_balance}
            emphasis
            icon={<Wallet size={18} />}
          />
          <SummaryCard
            label="Receitas do mês"
            value={summary.monthly_income}
            changePct={summary.income_change_pct}
            icon={<TrendingUp size={18} />}
          />
          <SummaryCard
            label="Despesas do mês"
            value={summary.monthly_expenses}
            changePct={summary.expense_change_pct}
            icon={<TrendingDown size={18} />}
          />
          <SummaryCard
            label="Saldo previsto"
            value={summary.projected_balance}
            icon={<PiggyBank size={18} />}
          />
          <SummaryCard
            label="Fatura atual"
            value={summary.current_invoices_total}
            icon={<CreditCard size={18} />}
          />
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <CashFlowChart points={cashFlow} />
      )}

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <CategoryBreakdown items={breakdown} />
      )}

      {!isLoading && <InsightsSection insights={insights} />}
    </div>
  );
}
