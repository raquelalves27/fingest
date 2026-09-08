import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createPurchase } from "@/modules/purchases/api";
import { type CreditCard } from "@/modules/cards/api";
import { useFormOptions } from "@/modules/transactions/useFormOptions";

interface Props {
  card: CreditCard;
  onClose: () => void;
  onCreated: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CreatePurchaseModal({ card, onClose, onCreated }: Props) {
  const { categories } = useFormOptions();
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [installmentsCount, setInstallmentsCount] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === "expense" && !c.parent_id);
  const n = parseInt(installmentsCount || "1", 10);
  const totalNum = parseFloat(totalAmount.replace(/\./g, "").replace(",", "."));
  const perInstallment = !isNaN(totalNum) && n > 0 ? totalNum / n : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const normalizedAmount = totalAmount.replace(/\./g, "").replace(",", ".");
      await createPurchase({
        credit_card_id: card.id,
        description,
        total_amount: normalizedAmount,
        purchase_date: purchaseDate,
        installments_count: n,
        category_id: categoryId || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Não foi possível salvar a compra.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full md:max-w-md rounded-t-card md:rounded-card bg-paper-soft dark:bg-ink-soft border border-paper-border dark:border-ink-border p-6 shadow-soft max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-ink dark:text-paper">Nova compra — {card.name}</h3>
          <button onClick={onClose} className="text-olive hover:text-ink dark:hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Descrição</label>
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Notebook"
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Valor total</label>
              <input
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
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
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Parcelas</label>
            <input
              required
              type="number"
              min={1}
              max={48}
              value={installmentsCount}
              onChange={(e) => setInstallmentsCount(e.target.value)}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            />
            {perInstallment !== null && n > 1 && (
              <p className="text-xs text-olive mt-1.5">
                {n}x de aproximadamente{" "}
                {perInstallment.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            >
              <option value="">Sem categoria</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-clay bg-clay/10 rounded-card px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-card bg-clay hover:bg-clay-soft text-white font-medium py-2.5 transition disabled:opacity-60"
          >
            {isSubmitting ? "Salvando…" : "Salvar compra"}
          </button>
        </form>
      </div>
    </div>
  );
}
