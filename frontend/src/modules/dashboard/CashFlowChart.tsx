import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { type CashFlowPoint } from "@/modules/dashboard/api";
import { formatCurrency } from "@/lib/format";

export function CashFlowChart({ points }: { points: CashFlowPoint[] }) {
  const data = points.map((p) => ({
    label: p.label,
    Receitas: parseFloat(p.income),
    Despesas: parseFloat(p.expense),
  }));

  return (
    <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
      <h3 className="text-sm font-medium text-olive mb-4">Fluxo financeiro (6 meses)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-paper-border dark:text-ink-border" />
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
          />
          <Line type="monotone" dataKey="Receitas" stroke="#1B6B4A" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Despesas" stroke="#C4622D" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
