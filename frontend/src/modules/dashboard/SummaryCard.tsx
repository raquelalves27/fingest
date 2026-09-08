import { type ReactNode } from "react";
import { formatCurrency, formatPercent } from "@/lib/format";

interface SummaryCardProps {
  label: string;
  value: string;
  changePct?: number | null;
  emphasis?: boolean;
  icon: ReactNode;
}

export function SummaryCard({ label, value, changePct, emphasis, icon }: SummaryCardProps) {
  const isPositiveChange = changePct != null && changePct >= 0;

  return (
    <div
      className={`rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft ${
        emphasis ? "md:col-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-olive">{label}</span>
        <span className="text-olive/60">{icon}</span>
      </div>
      <p className={`num text-ink dark:text-paper ${emphasis ? "text-4xl" : "text-2xl"}`}>
        {formatCurrency(value)}
      </p>
      {changePct !== undefined && changePct !== null && (
        <p className={`mt-2 text-xs font-medium ${isPositiveChange ? "text-emerald" : "text-clay"}`}>
          {formatPercent(changePct)} vs. mês anterior
        </p>
      )}
    </div>
  );
}
