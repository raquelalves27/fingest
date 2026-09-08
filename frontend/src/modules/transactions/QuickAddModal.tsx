import { useState, type FormEvent } from "react";
import { X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { createIncome } from "@/modules/incomes/api";
import { createExpense } from "@/modules/expenses/api";
import { useFormOptions } from "@/modules/transactions/useFormOptions";

type TransactionKind = "income" | "expense";

interface Props {
  onClose: () => void;
  onCreated: () => void;
  initialKind?: TransactionKind;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function QuickAddModal({ onClose, onCreated, initialKind = "expense" }: Props) {
  const { accounts, categories, isLoading } = useFormOptions();
  const [kind, setKind] = useState<TransactionKind>(initialKind);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relevantCategories = categories.filter((c) => c.type === kind && !c.parent_id);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const normalizedAmount = amount.replace(/\./g, "").replace(",", ".");
      if (kind === "income") {
        await createIncome({
          description,
          amount: normalizedAmount,
          income_date: date,
          account_id: accountId || undefined,
          category_id: categoryId || undefined,
          status: "received",
        });
      } else {
        await createExpense({
          description,
          amount: normalizedAmount,
          expense_date: date,
          account_id: accountId || undefined,
          category_id: categoryId || undefined,
          status: "paid",
        });
      }
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Não foi possível salvar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full md:max-w-md rounded-t-card md:rounded-card bg-paper-soft dark:bg-ink-soft border border-paper-border dark:border-ink-border p-6 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-ink dark:text-paper">Adicionar</h3>
          <button onClick={onClose} className="text-olive hover:text-ink dark:hover:text-paper">
            <X size={20} />
          </button>
        </div>

        {/* Seletor de tipo */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            type="button"
            onClick={() => setKind("expense")}
            className={`flex items-center justify-center gap-2 rounded-card py-2.5 text-sm font-medium border transition ${
              kind === "expense"
                ? "border-clay bg-clay/10 text-clay"
                : "border-paper-border dark:border-ink-border text-olive"
            }`}
          >
            <ArrowDownCircle size={16} />
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setKind("income")}
            className={`flex items-center justify-center gap-2 rounded-card py-2.5 text-sm font-medium border transition ${
              kind === "income"
                ? "border-emerald bg-emerald/10 text-emerald"
                : "border-paper-border dark:border-ink-border text-olive"
            }`}
          >
            <ArrowUpCircle size={16} />
            Receita
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Descrição</label>
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={kind === "expense" ? "Ex: Supermercado" : "Ex: Salário"}
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
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            >
              <option value="">Sem categoria</option>
              {relevantCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Conta</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            >
              <option value="">Não lançar em conta ainda</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-clay bg-clay/10 rounded-card px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full rounded-card text-white font-medium py-2.5 transition disabled:opacity-60 ${
              kind === "expense" ? "bg-clay hover:bg-clay-soft" : "bg-emerald hover:bg-emerald-deep"
            }`}
          >
            {isSubmitting ? "Salvando…" : kind === "expense" ? "Salvar despesa" : "Salvar receita"}
          </button>
        </form>
      </div>
    </div>
  );
}
