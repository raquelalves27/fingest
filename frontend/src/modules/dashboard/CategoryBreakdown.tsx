import { useState } from "react";
import { ChevronRight, Flame, Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getCategoryBreakdownItems,
  type CategoryBreakdownItem,
  type CategoryBreakdownLineItem,
} from "@/modules/dashboard/api";
import { getExpense, type Expense } from "@/modules/expenses/api";
import { getPurchase, type Purchase } from "@/modules/purchases/api";
import { listCreditCards, type CreditCard } from "@/modules/cards/api";
import { QuickAddModal } from "@/modules/transactions/QuickAddModal";
import { CreatePurchaseModal } from "@/modules/purchases/CreatePurchaseModal";

const FALLBACK_COLOR = "#8B8577";

function lineItemMeta(item: CategoryBreakdownLineItem): string {
  if (item.kind === "expense") return "despesa avulsa";
  if (item.is_recurring) return "recorrente";
  if (item.total_installments && item.total_installments > 1) {
    return `parcela ${item.installment_number}/${item.total_installments}`;
  }
  return "à vista";
}

interface Props {
  items: CategoryBreakdownItem[];
  /** Chamado depois de uma edição bem-sucedida, pra quem segura os totais
   * (a tela toda) recarregar — editar um lançamento pode mudar o total da
   * categoria, a % do gargalo, até pra qual categoria ele pertence. */
  onChanged?: () => void;
}

export function CategoryBreakdown({ items, onChanged }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<Record<string, CategoryBreakdownLineItem[]>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<{ purchase: Purchase; card: CreditCard } | null>(null);
  const [cardsCache, setCardsCache] = useState<CreditCard[] | null>(null);

  async function toggle(item: CategoryBreakdownItem) {
    const key = item.category_id ?? "__none__";
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    if (!lineItems[key]) {
      setLoadingKey(key);
      const data = await getCategoryBreakdownItems(item.category_id);
      setLineItems((prev) => ({ ...prev, [key]: data }));
      setLoadingKey(null);
    }
  }

  async function handleEdit(item: CategoryBreakdownLineItem) {
    if (item.kind === "expense") {
      setEditingExpense(await getExpense(item.id));
      return;
    }
    const [purchase, cards] = await Promise.all([
      getPurchase(item.id),
      cardsCache ? Promise.resolve(cardsCache) : listCreditCards(),
    ]);
    if (!cardsCache) setCardsCache(cards);
    const card = cards.find((c) => c.id === purchase.credit_card_id);
    if (card) setEditingPurchase({ purchase, card });
  }

  // Uma edição pode mudar total, percentuais e até a categoria do
  // lançamento — mais simples e seguro recarregar tudo (pai + o cache local
  // de detalhe) do que tentar remendar só o que mudou.
  function handleEdited() {
    setEditingExpense(null);
    setEditingPurchase(null);
    setExpandedKey(null);
    setLineItems({});
    onChanged?.();
  }

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
        <h3 className="text-sm font-medium text-olive mb-2">Gastos por categoria</h3>
        <p className="text-sm text-olive/70 py-6 text-center">
          Nenhuma despesa categorizada este mês ainda.
        </p>
      </div>
    );
  }

  const total = items.reduce((acc, item) => acc + parseFloat(item.total), 0);
  const top = items[0];
  const topColor = top.color ?? FALLBACK_COLOR;

  return (
    <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-olive">Gastos por categoria (mês atual)</h3>
        <span className="text-xs text-olive">{items.length} categorias</span>
      </div>
      <p className="num text-3xl text-ink dark:text-paper mb-4">{formatCurrency(total)}</p>

      {/* Gargalo: categoria que mais pesa no mês */}
      <div
        className="flex items-center gap-3 rounded-card border p-3 mb-5"
        style={{ borderColor: `${topColor}55`, backgroundColor: `${topColor}14` }}
      >
        <span
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          style={{ backgroundColor: `${topColor}26` }}
        >
          <Flame size={16} style={{ color: topColor }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-olive">Maior gasto — onde está o gargalo</p>
          <p className="text-sm font-medium text-ink dark:text-paper truncate">{top.category_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="num text-base font-semibold text-ink dark:text-paper">{formatCurrency(top.total)}</p>
          <p className="text-xs text-olive">{top.percentage.toFixed(0)}% do total</p>
        </div>
      </div>

      <div className="space-y-1">
        {items.map((item, idx) => {
          const key = item.category_id ?? "__none__";
          const color = item.color ?? FALLBACK_COLOR;
          const isTop = idx === 0;
          const isExpanded = expandedKey === key;
          const details = lineItems[key];

          return (
            <div key={key} className="py-2.5">
              <button onClick={() => toggle(item)} className="w-full text-left group">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2 min-w-0">
                    <ChevronRight
                      size={14}
                      className={`text-olive shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                    <span className="text-xs text-olive/60 w-3.5 shrink-0 tabular-nums">{idx + 1}</span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span
                      className={`truncate text-ink dark:text-paper ${isTop ? "font-semibold" : ""} ${
                        item.is_uncategorized ? "italic text-olive" : ""
                      }`}
                    >
                      {item.category_name}
                    </span>
                    <span className="text-xs text-olive shrink-0">{item.percentage.toFixed(0)}%</span>
                  </span>
                  <span className={`num text-ink dark:text-paper shrink-0 ${isTop ? "font-semibold" : ""}`}>
                    {formatCurrency(item.total)}
                  </span>
                </div>
                <div
                  className={`rounded-full bg-ink/5 dark:bg-paper/10 overflow-hidden ml-[22px] ${
                    isTop ? "h-2.5" : "h-1.5"
                  }`}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percentage}%`, backgroundColor: color }}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="mt-2.5 ml-[22px] space-y-2 border-l border-paper-border dark:border-ink-border pl-3">
                  {loadingKey === key ? (
                    <p className="text-xs text-olive py-1">Carregando…</p>
                  ) : !details || details.length === 0 ? (
                    <p className="text-xs text-olive py-1">Nenhum lançamento encontrado.</p>
                  ) : (
                    details.map((li) => (
                      <div
                        key={`${li.kind}-${li.id}-${li.installment_number ?? 0}`}
                        className="flex items-center justify-between gap-2 py-1 group/item"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-ink dark:text-paper truncate">
                            {li.description}
                            {li.kind === "card_purchase" && (
                              <span className="text-xs text-olive"> · {li.card_name}</span>
                            )}
                          </p>
                          <p className="text-xs text-olive">
                            {formatDate(li.date)} · {lineItemMeta(li)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="num text-sm text-ink dark:text-paper">{formatCurrency(li.amount)}</span>
                          <button
                            onClick={() => handleEdit(li)}
                            title="Editar lançamento"
                            className="text-olive opacity-0 group-hover/item:opacity-100 hover:text-ink dark:hover:text-paper transition"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingExpense && (
        <QuickAddModal expense={editingExpense} onClose={() => setEditingExpense(null)} onCreated={handleEdited} />
      )}

      {editingPurchase && (
        <CreatePurchaseModal
          card={editingPurchase.card}
          purchase={editingPurchase.purchase}
          onClose={() => setEditingPurchase(null)}
          onCreated={handleEdited}
        />
      )}
    </div>
  );
}
