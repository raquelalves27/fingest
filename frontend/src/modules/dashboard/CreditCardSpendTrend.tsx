import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { type CreditCardTrendPoint } from "@/modules/dashboard/api";
import { formatCurrency } from "@/lib/format";

export function CreditCardSpendTrend({ points }: { points: CreditCardTrendPoint[] }) {
  const data = points.map((p) => ({
    label: p.label,
    Pago: parseFloat(p.paid),
    "Em aberto": parseFloat(p.pending),
  }));

  const hasData = data.some((d) => d.Pago > 0 || d["Em aberto"] > 0);

  return (
    <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
      <h3 className="text-sm font-medium text-olive mb-4">Gasto no cartão por mês</h3>
      {!hasData ? (
        <p className="text-sm text-olive/70 py-8 text-center">Sem faturas no período.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-paper-border dark:text-ink-border"
              vertical={false}
            />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" className="text-olive" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="currentColor"
              className="text-olive"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: 12, border: "1px solid #E4E0D4", fontSize: 13 }}
              cursor={{ fill: "rgba(139,133,119,0.08)" }}
            />
            <Bar dataKey="Pago" stackId="a" fill="#1B6B4A" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Em aberto" stackId="a" fill="#E08150" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
