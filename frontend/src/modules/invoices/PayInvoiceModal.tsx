import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { payInvoice, invoiceLabel, type Invoice } from "@/modules/invoices/api";
import { type Account } from "@/modules/accounts/api";
import { formatCurrency } from "@/lib/format";

interface Props {
  invoice: Invoice;
  accounts: Account[];
  onClose: () => void;
  onPaid: () => void;
}

export function PayInvoiceModal({ invoice, accounts, onClose, onPaid }: Props) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await payInvoice(invoice.id, accountId);
      onPaid();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Não foi possível pagar a fatura.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full md:max-w-md rounded-t-card md:rounded-card bg-paper-soft dark:bg-ink-soft border border-paper-border dark:border-ink-border p-6 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-ink dark:text-paper">Pagar fatura</h3>
          <button onClick={onClose} className="text-olive hover:text-ink dark:hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 rounded-card bg-ink/5 dark:bg-paper/5 p-4">
          <p className="text-sm text-olive">Fatura de {invoiceLabel(invoice)}</p>
          <p className="num text-2xl text-ink dark:text-paper mt-1">{formatCurrency(invoice.total_amount)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">
              Pagar com qual conta?
            </label>
            <select
              required
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {formatCurrency(a.current_balance)}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-clay bg-clay/10 rounded-card px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !accountId}
            className="w-full rounded-card bg-emerald hover:bg-emerald-deep text-white font-medium py-2.5 transition disabled:opacity-60"
          >
            {isSubmitting ? "Pagando…" : "Confirmar pagamento"}
          </button>
        </form>
      </div>
    </div>
  );
}
