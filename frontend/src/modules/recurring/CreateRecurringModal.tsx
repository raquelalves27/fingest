import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createRecurring, frequencyLabels, type RecurrenceFrequency } from "@/modules/recurring/api";
import { useFormOptions } from "@/modules/transactions/useFormOptions";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CreateRecurringModal({ onClose, onCreated }: Props) {
  const { accounts, categories } = useFormOptions();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [startDate, setStartDate] = useState(todayISO());
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relevantCategories = categories.filter((c) => c.type === type && !c.parent_id);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const normalizedAmount = amount.replace(/\./g, "").replace(",", ".");
      await createRecurring({
        type, description, amount: normalizedAmount, frequency, start_date: startDate,
        account_id: accountId || undefined, category_id: categoryId || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Não foi possível criar a recorrência.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full md:max-w-md rounded-t-card md:rounded-card bg-paper-soft dark:bg-ink-soft border border-paper-border dark:border-ink-border p-6 shadow-soft max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-ink dark:text-paper">Nova recorrência</h3>
          <button onClick={onClose} className="text-olive hover:text-ink dark:hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setType("expense"); setCategoryId(""); }}
              className={`rounded-card py-2.5 text-sm font-medium border transition ${
                type === "expense" ? "border-clay bg-clay/10 text-clay" : "border-paper-border dark:border-ink-border text-olive"
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => { setType("income"); setCategoryId(""); }}
              className={`rounded-card py-2.5 text-sm font-medium border transition ${
                type === "income" ? "border-emerald bg-emerald/10 text-emerald" : "border-paper-border dark:border-ink-border text-olive"
              }`}
            >
              Receita
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Descrição</label>
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Netflix, Aluguel, Salário"
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            />
          </div>

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
              <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Frequência</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
              >
                {Object.entries(frequencyLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Primeira ocorrência</label>
            <input
              required
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            >
              <option value="">Sem categoria</option>
              {relevantCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Conta</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            >
              <option value="">Não lançar em conta ainda</option>
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
            {isSubmitting ? "Salvando…" : "Criar recorrência"}
          </button>
        </form>
      </div>
    </div>
  );
}
