import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CreditCard, Info } from "lucide-react";
import {
  getCreditCardDashboard,
  type CardHealth,
  type CardScope,
  type CreditCardDashboard,
  type CreditCardPanel,
} from "@/modules/dashboard/api";
import { CreditCardCategoryTree } from "@/modules/dashboard/CreditCardCategoryTree";
import { CreditCardSpendTrend } from "@/modules/dashboard/CreditCardSpendTrend";
import { Skeleton } from "@/components/shared/Skeleton";
import { formatCurrency, formatPercent } from "@/lib/format";

const HEALTH_DOT: Record<CardHealth, string> = {
  ok: "bg-emerald",
  attention: "bg-clay-soft",
  critical: "bg-clay",
};

function utilizationColor(pct: number): string {
  if (pct >= 90) return "#C4622D";
  if (pct >= 70) return "#E08150";
  return "#1B6B4A";
}

function dueLabel(days: number): { text: string; tone: string } {
  if (days < 0) return { text: `venceu há ${Math.abs(days)}d`, tone: "text-clay font-medium" };
  if (days === 0) return { text: "vence hoje", tone: "text-clay font-medium" };
  if (days <= 3) return { text: `vence em ${days}d`, tone: "text-clay-soft font-medium" };
  return { text: `vence em ${days}d`, tone: "text-olive" };
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-3">
      <p className="text-xs text-olive mb-1">{label}</p>
      <p className="num text-lg text-ink dark:text-paper leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-olive/70 mt-0.5">{hint}</p>}
    </div>
  );
}

function CardPanel({ card }: { card: CreditCardPanel }) {
  const ci = card.current_invoice;
  const due = ci ? dueLabel(ci.days_until_due) : null;
  const barColor = utilizationColor(card.utilization_pct);

  return (
    <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink p-4 shadow-soft">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink dark:text-paper flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[card.health]}`} />
            <span className="truncate">{card.name}</span>
          </p>
          <p className="text-xs text-olive mt-0.5">
            {[card.brand, card.last_four_digits && `•••• ${card.last_four_digits}`]
              .filter(Boolean)
              .join(" · ") || "Cartão de crédito"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="num text-lg text-ink dark:text-paper leading-tight">
            {formatCurrency(ci?.total ?? "0")}
          </p>
          <p className={`text-[11px] ${due?.tone ?? "text-olive"}`}>
            {ci ? `${ci.label} · ${due?.text}` : "sem fatura aberta"}
          </p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-ink/5 dark:bg-paper/10 overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(card.utilization_pct, 100)}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-olive">
        <span>{card.utilization_pct.toFixed(0)}% do limite usado</span>
        <span>{formatCurrency(card.available_limit)} livres</span>
      </div>

      {(parseFloat(card.next_invoice_total) > 0 || parseFloat(card.recurring_monthly_total) > 0) && (
        <div className="flex items-center justify-between text-[11px] text-olive mt-2 pt-2 border-t border-paper-border dark:border-ink-border">
          <span>Próxima fatura: {formatCurrency(card.next_invoice_total)}</span>
          {parseFloat(card.recurring_monthly_total) > 0 && (
            <span>Assinaturas: {formatCurrency(card.recurring_monthly_total)}/mês</span>
          )}
        </div>
      )}
    </div>
  );
}

const INSIGHT_ICON = {
  critical: <AlertTriangle size={15} className="text-clay shrink-0 mt-0.5" />,
  attention: <AlertTriangle size={15} className="text-clay-soft shrink-0 mt-0.5" />,
  info: <Info size={15} className="text-olive shrink-0 mt-0.5" />,
};

export function CreditCardSection() {
  const [data, setData] = useState<CreditCardDashboard | null>(null);
  const [scope, setScope] = useState<CardScope>("current");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    getCreditCardDashboard(scope).then((d) => {
      if (alive) {
        setData(d);
        setIsLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [scope]);

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!data) return null;

  if (data.cards.length === 0) {
    return (
      <section className="space-y-3">
        <h3 className="font-display text-xl text-ink dark:text-paper">Cartões de crédito</h3>
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-8 text-center">
          <CreditCard className="mx-auto text-olive/50 mb-2" size={24} />
          <p className="text-sm text-olive">
            Cadastre um cartão em{" "}
            <Link to="/cards" className="text-emerald hover:underline">
              Cartões
            </Link>{" "}
            para ver a análise aqui.
          </p>
        </div>
      </section>
    );
  }

  const t = data.totals;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-ink dark:text-paper">Cartões de crédito</h3>
        <Link to="/cards" className="text-xs text-emerald hover:underline">
          Gerenciar
        </Link>
      </div>

      {/* Números para decisão */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat
          label="Limite disponível"
          value={formatCurrency(t.available_limit)}
          hint={`de ${formatCurrency(t.credit_limit)}`}
        />
        <MiniStat
          label="Utilização"
          value={`${t.utilization_pct.toFixed(0)}%`}
          hint={`${formatCurrency(t.used_limit)} em uso`}
        />
        <MiniStat
          label="Fatura atual"
          value={formatCurrency(t.current_invoices_total)}
          hint={
            t.spend_change_pct != null
              ? `${formatPercent(t.spend_change_pct)} vs. mês anterior`
              : undefined
          }
        />
        <MiniStat
          label="Comprometido à frente"
          value={formatCurrency(t.future_committed_total)}
          hint="parcelas nas próximas faturas"
        />
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-4 shadow-soft space-y-2">
          {data.insights.map((ins, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-ink dark:text-paper leading-snug">
              {INSIGHT_ICON[ins.level]}
              <span>{ins.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cartões */}
      <div className="grid md:grid-cols-2 gap-3">
        {data.cards.map((card) => (
          <CardPanel key={card.id} card={card} />
        ))}
      </div>

      {/* Segregação por categoria/subcategoria + tendência */}
      <div className="grid lg:grid-cols-2 gap-4">
        <CreditCardCategoryTree
          nodes={data.category_breakdown}
          scope={data.scope}
          onScopeChange={setScope}
        />
        <CreditCardSpendTrend points={data.trend} />
      </div>
    </section>
  );
}
