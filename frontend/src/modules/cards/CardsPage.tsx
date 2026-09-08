import { useEffect, useState } from "react";
import { Plus, CreditCard as CardIcon, Receipt } from "lucide-react";
import { listCreditCards, type CreditCard } from "@/modules/cards/api";
import { listPurchases, cancelPurchase, updatePurchase, type Purchase } from "@/modules/purchases/api";
import { listInvoices, invoiceLabel, invoiceStatusLabels, type Invoice } from "@/modules/invoices/api";
import { listAccounts, type Account } from "@/modules/accounts/api";
import { CreateCardModal } from "@/modules/cards/CreateCardModal";
import { CreatePurchaseModal } from "@/modules/purchases/CreatePurchaseModal";
import { PayInvoiceModal } from "@/modules/invoices/PayInvoiceModal";
import { CardTile } from "@/modules/cards/CardTile";
import { Toast, useToast } from "@/components/shared/Toast";
import { Skeleton } from "@/components/shared/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";

export function CardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const { message, showToast } = useToast();

  async function loadAll() {
    setIsLoading(true);
    const [cardsData, accountsData] = await Promise.all([listCreditCards(), listAccounts()]);
    setCards(cardsData);
    setAccounts(accountsData);
    if (cardsData.length > 0) {
      setSelectedCardId((prev) => prev ?? cardsData[0].id);
    }
    setIsLoading(false);
  }

  async function loadCardDetails(cardId: string) {
    const [invoicesData, purchasesData] = await Promise.all([
      listInvoices(cardId),
      listPurchases(cardId),
    ]);
    setInvoices(invoicesData);
    setPurchases(purchasesData);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (selectedCardId) {
      loadCardDetails(selectedCardId);
    }
  }, [selectedCardId]);

  const selectedCard = cards.find((c) => c.id === selectedCardId);

  const sortedInvoices = [...invoices].sort(
    (a, b) => a.reference_year - b.reference_year || a.reference_month - b.reference_month
  );
  const currentInvoice = sortedInvoices.find((i) => i.status !== "paid");
  const upcomingInvoices = sortedInvoices.filter((i) => i.id !== currentInvoice?.id).slice(0, 5);

  async function handleCancelPurchase(id: string) {
    await cancelPurchase(id);
    showToast("Compra cancelada.");
    if (selectedCardId) loadCardDetails(selectedCardId);
    loadAll();
  }

  async function handleToggleRecurring(p: Purchase) {
    await updatePurchase(p.id, { recurring_active: !p.recurring_active });
    showToast(p.recurring_active ? "Recorrência pausada." : "Recorrência reativada.");
    if (selectedCardId) loadCardDetails(selectedCardId);
    loadAll();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-paper">Cartões</h2>
          <p className="text-sm text-olive mt-1">Suas faturas e compras no cartão.</p>
        </div>
        <button
          onClick={() => setShowCardModal(true)}
          className="flex items-center gap-2 rounded-card bg-emerald hover:bg-emerald-deep text-white text-sm font-medium px-4 py-2.5 transition"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo cartão</span>
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
          <CardIcon className="mx-auto text-olive/50 mb-3" size={32} />
          <p className="text-olive">Adicione seu primeiro cartão para começar.</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                isSelected={card.id === selectedCardId}
                onClick={() => setSelectedCardId(card.id)}
              />
            ))}
          </div>

          {selectedCard && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl text-ink dark:text-paper">{selectedCard.name}</h3>
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="flex items-center gap-2 rounded-card bg-clay hover:bg-clay-soft text-white text-sm font-medium px-4 py-2.5 transition"
                >
                  <Plus size={16} />
                  Nova compra
                </button>
              </div>

              {/* Fatura atual */}
              {currentInvoice && (
                <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-olive">Fatura atual — {invoiceLabel(currentInvoice)}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-olive/10 text-olive">
                      {invoiceStatusLabels[currentInvoice.status]}
                    </span>
                  </div>
                  <p className="num text-3xl text-ink dark:text-paper mb-3">
                    {formatCurrency(currentInvoice.total_amount)}
                  </p>
                  <div className="flex items-center justify-between text-sm text-olive mb-4">
                    <span>Fechamento: {formatDate(currentInvoice.closing_date)}</span>
                    <span>Vencimento: {formatDate(currentInvoice.due_date)}</span>
                  </div>
                  <button
                    onClick={() => setPayingInvoice(currentInvoice)}
                    disabled={accounts.length === 0}
                    className="w-full rounded-card bg-emerald hover:bg-emerald-deep text-white text-sm font-medium py-2.5 transition disabled:opacity-50"
                  >
                    Pagar fatura
                  </button>
                </div>
              )}

              {/* Próximas faturas */}
              {upcomingInvoices.length > 0 && (
                <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
                  <h4 className="text-sm font-medium text-olive mb-3">Próximas faturas</h4>
                  <div className="space-y-2">
                    {upcomingInvoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink dark:text-paper">{invoiceLabel(inv)}</span>
                        <span className="num text-ink dark:text-paper">{formatCurrency(inv.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compras */}
              <div>
                <h4 className="text-sm font-medium text-olive mb-3">Compras</h4>
                {purchases.length === 0 ? (
                  <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-8 text-center">
                    <Receipt className="mx-auto text-olive/50 mb-2" size={24} />
                    <p className="text-sm text-olive">Nenhuma compra lançada neste cartão ainda.</p>
                  </div>
                ) : (
                  <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 divide-y divide-paper-border dark:divide-ink-border shadow-soft">
                    {purchases.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-3 group">
                        <div>
                          <p className="text-sm font-medium text-ink dark:text-paper flex items-center gap-2">
                            {p.description}
                            {p.is_recurring && (
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                  p.recurring_active
                                    ? "bg-clay/10 text-clay"
                                    : "bg-olive/10 text-olive"
                                }`}
                              >
                                {p.recurring_active ? "recorrente" : "pausada"}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-olive">
                            {formatDate(p.purchase_date)}
                            {p.is_recurring
                              ? ` · todo dia ${p.recurring_day} · ${p.installments_count} lançada(s)`
                              : p.installments_count > 1
                              ? ` · ${p.installments_count}x`
                              : " · à vista"}
                            {p.status === "cancelled" ? " · cancelada" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="num text-sm font-medium text-ink dark:text-paper">
                            {formatCurrency(p.total_amount)}
                            {p.is_recurring ? "/mês" : ""}
                          </span>
                          {p.status === "active" && (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => setEditingPurchase(p)}
                                className="text-xs text-olive hover:text-ink dark:hover:text-paper hover:underline"
                              >
                                Editar
                              </button>
                              {p.is_recurring && (
                                <button
                                  onClick={() => handleToggleRecurring(p)}
                                  className="text-xs text-olive hover:underline"
                                >
                                  {p.recurring_active ? "Pausar" : "Reativar"}
                                </button>
                              )}
                              <button
                                onClick={() => handleCancelPurchase(p.id)}
                                className="text-xs text-clay hover:underline"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {showCardModal && (
        <CreateCardModal
          onClose={() => setShowCardModal(false)}
          onCreated={(card) => {
            setCards((prev) => [...prev, card]);
            setSelectedCardId(card.id);
            setShowCardModal(false);
          }}
        />
      )}

      {showPurchaseModal && selectedCard && (
        <CreatePurchaseModal
          card={selectedCard}
          onClose={() => setShowPurchaseModal(false)}
          onCreated={() => {
            setShowPurchaseModal(false);
            loadCardDetails(selectedCard.id);
            loadAll();
            showToast("Compra adicionada com sucesso.");
          }}
        />
      )}

      {editingPurchase && selectedCard && (
        <CreatePurchaseModal
          card={selectedCard}
          purchase={editingPurchase}
          onClose={() => setEditingPurchase(null)}
          onCreated={() => {
            setEditingPurchase(null);
            loadCardDetails(selectedCard.id);
            loadAll();
            showToast("Lançamento atualizado.");
          }}
        />
      )}

      {payingInvoice && (
        <PayInvoiceModal
          invoice={payingInvoice}
          accounts={accounts}
          onClose={() => setPayingInvoice(null)}
          onPaid={() => {
            setPayingInvoice(null);
            if (selectedCardId) loadCardDetails(selectedCardId);
            loadAll();
            showToast("Fatura paga com sucesso.");
          }}
        />
      )}

      <Toast message={message} />
    </div>
  );
}
