import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createAccount, accountTypeLabels, type AccountType, type Account } from "@/modules/accounts/api";

interface Props {
  onClose: () => void;
  onCreated: (account: Account) => void;
}

export function CreateAccountModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [initialBalance, setInitialBalance] = useState("0,00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const normalizedBalance = initialBalance.replace(/\./g, "").replace(",", ".");
      const account = await createAccount({
        name,
        bank: bank || undefined,
        type,
        initial_balance: normalizedBalance,
      });
      onCreated(account);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Não foi possível criar a conta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm px-0 md:px-4">
      <div className="w-full md:max-w-md rounded-t-card md:rounded-card bg-paper-soft dark:bg-ink-soft border border-paper-border dark:border-ink-border p-6 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-ink dark:text-paper">Nova conta</h3>
          <button onClick={onClose} className="text-olive hover:text-ink dark:hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank, Carteira"
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Banco (opcional)</label>
            <input
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Ex: Nubank"
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            >
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Saldo inicial</label>
            <input
              required
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            />
          </div>

          {error && <p className="text-sm text-clay bg-clay/10 rounded-card px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-card bg-emerald hover:bg-emerald-deep text-white font-medium py-2.5 transition disabled:opacity-60"
          >
            {isSubmitting ? "Salvando…" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
