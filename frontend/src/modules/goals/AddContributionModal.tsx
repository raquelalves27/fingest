import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { addContribution, type Goal } from "@/modules/goals/api";
import { type Account } from "@/modules/accounts/api";

interface Props {
  goal: Goal;
  accounts: Account[];
  onClose: () => void;
  onAdded: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AddContributionModal({ goal, accounts, onClose, onAdded }: Props) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const normalizedAmount = amount.replace(/\./g, "").replace(",", ".");
      await addContribution(goal.id, {
        amount: normalizedAmount, contribution_date: date, account_id: accountId || undefined,
      });
      onAdded();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Não foi possível registrar o aporte.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full md:max-w-md rounded-t-card md:rounded-card bg-paper-soft dark:bg-ink-soft border border-paper-border dark:border-ink-border p-6 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-ink dark:text-paper">Aporte — {goal.name}</h3>
          <button onClick={onClose} className="text-olive hover:text-ink dark:hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Valor</label>
              <input
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Data</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">
              Debitar de qual conta? (opcional)
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            >
              <option value="">Não debitar de nenhuma conta (apenas registrar)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-clay bg-clay/10 rounded-card px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-card bg-emerald hover:bg-emerald-deep text-white font-medium py-2.5 transition disabled:opacity-60"
          >
            {isSubmitting ? "Salvando…" : "Registrar aporte"}
          </button>
        </form>
      </div>
    </div>
  );
}
