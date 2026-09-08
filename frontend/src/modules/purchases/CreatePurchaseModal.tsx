import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import {
  createPurchase,
  updatePurchase,
  type Purchase,
} from "@/modules/purchases/api";
import { type CreditCard } from "@/modules/cards/api";
import { useFormOptions } from "@/modules/transactions/useFormOptions";

interface Props {
  card: CreditCard;
  /** Quando presente, o modal entra em modo de edição desse lançamento. */
  purchase?: Purchase;
  onClose: () => void;
  onCreated: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function amountToInput(value: string) {
  const n = parseFloat(value);
  if (isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CreatePurchaseModal({ card, purchase, onClose, onCreated }: Props) {
  const isEdit = !!purchase;
  const { categories } = useFormOptions();

  const [description, setDescription] = useState(purchase?.description ?? "");
  const [totalAmount, setTotalAmount] = useState(
    purchase ? amountToInput(purchase.total_amount) : ""
  );
  const [purchaseDate, setPurchaseDate] = useState(purchase?.purchase_date ?? todayISO());
  const [installmentsCount, setInstallmentsCount] = useState(
    String(purchase?.installments_count ?? 1)
  );
  const [categoryId, setCategoryId] = useState(purchase?.category_id ?? "");
  const [isRecurring, setIsRecurring] = useState(purchase?.is_recurring ?? false);
  const [recurringDay, setRecurringDay] = useState(
    String(purchase?.recurring_day ?? new Date().getDate())
  );
  const [recurringActive, setRecurringActive] = useState(purchase?.recurring_active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === "expense" && !c.parent_id);
  const n = parseInt(installmentsCount || "1", 10);
  const totalNum = parseFloat(totalAmount.replace(/\./g, "").replace(",", "."));
  const perInstallment = !isNaN(totalNum) && n > 0 ? totalNum / n : null;

  // Numa compra recorrente já existente, o dia de recorrência é a base da data;
  // em criação, usamos o dia da data escolhida.
  const effectiveRecurringDay = isEdit
    ? parseInt(recurringDay || "1", 10)
    : new Date(purchaseDate + "T00:00:00").getDate();

  // Regras de edição: valor/parcelas/data de uma compra parcelada travam depois
  // que qualquer parcela é paga (o passado é imutável).
  const hasPaidInstallment =
    isEdit && purchase!.installments.some((i) => i.status === "paid");
  const lockFinancials = isEdit && !purchase!.is_recurring && hasPaidInstallment;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const normalizedAmount = totalAmount.replace(/\./g, "").replace(",", ".");
    try {
      if (isEdit) {
        if (purchase!.is_recurring) {
          await updatePurchase(purchase!.id, {
            description,
            category_id: categoryId || null,
            total_amount: normalizedAmount,
            recurring_day: effectiveRecurringDay,
            recurring_active: recurringActive,
          });
        } else {
          await updatePurchase(purchase!.id, {
            description,
            category_id: categoryId || null,
            ...(lockFinancials
              ? {}
              : {
                  total_amount: normalizedAmount,
                  purchase_date: purchaseDate,
                  installments_count: n,
                }),
          });
        }
      } else {
        await createPurchase({
          credit_card_id: card.id,
          description,
          total_amount: normalizedAmount,
          purchase_date: purchaseDate,
          installments_count: isRecurring ? 1 : n,
          category_id: categoryId || undefined,
          is_recurring: isRecurring,
          ...(isRecurring ? { recurring_day: effectiveRecurringDay } : {}),
        });
      }
      onCreated();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          (isEdit ? "Não foi possível salvar as alterações." : "Não foi possível salvar a compra.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const showRecurringFields = isEdit ? purchase!.is_recurring : isRecurring;
  const title = isEdit
    ? `Editar ${purchase!.is_recurring ? "recorrência" : "compra"} — ${card.name}`
    : `Nova compra — ${card.name}`;

  return (
    <div className="fixed inset-0 z-20 flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full md:max-w-md rounded-t-card md:rounded-card bg-paper-soft dark:bg-ink-soft border border-paper-border dark:border-ink-border p-6 shadow-soft max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-ink dark:text-paper">{title}</h3>
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
              placeholder="Ex: Netflix"
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            />
          </div>

          {!isEdit && (
            <label className="flex items-start gap-3 rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="mt-0.5 accent-clay"
              />
              <span className="text-sm">
                <span className="font-medium text-ink dark:text-paper">Recorrência mensal</span>
                <span className="block text-xs text-olive mt-0.5">
                  Lança automaticamente todo mês (ex: assinaturas) até você pausar.
                </span>
              </span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">
                {showRecurringFields ? "Valor mensal" : "Valor total"}
              </label>
              <input
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition disabled:opacity-50"
                disabled={lockFinancials}
              />
            </div>
            {isEdit && purchase!.is_recurring ? (
              <div>
                <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">
                  Dia do mês
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  max={31}
                  value={recurringDay}
                  onChange={(e) => setRecurringDay(e.target.value)}
                  className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">
                  {isRecurring ? "1º lançamento" : "Data"}
                </label>
                <input
                  required
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  disabled={lockFinancials}
                  className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition disabled:opacity-50"
                />
              </div>
            )}
          </div>

          {showRecurringFields ? (
            <p className="text-xs text-olive">
              Será lançada todo mês no dia {effectiveRecurringDay} na fatura correspondente, até a
              recorrência ser pausada.
            </p>
          ) : (
            <div>
              <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Parcelas</label>
              <input
                required
                type="number"
                min={1}
                max={48}
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(e.target.value)}
                disabled={lockFinancials}
                className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition disabled:opacity-50"
              />
              {perInstallment !== null && n > 1 && (
                <p className="text-xs text-olive mt-1.5">
                  {n}x de aproximadamente{" "}
                  {perInstallment.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              )}
            </div>
          )}

          {isEdit && purchase!.is_recurring && (
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={recurringActive}
                onChange={(e) => setRecurringActive(e.target.checked)}
                className="accent-clay"
              />
              <span className="text-ink dark:text-paper">
                Recorrência ativa
                <span className="block text-xs text-olive">
                  Desmarque para pausar os lançamentos automáticos sem apagar o histórico.
                </span>
              </span>
            </label>
          )}

          {lockFinancials && (
            <p className="text-xs text-olive bg-olive/10 rounded-card px-3 py-2">
              Esta compra já teve parcelas pagas — valor, parcelas e data não podem ser alterados.
            </p>
          )}

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
            {isSubmitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Salvar compra"}
          </button>
        </form>
      </div>
    </div>
  );
}
