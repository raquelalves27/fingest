import { useEffect, useState } from "react";
import { Plus, Pencil, ChevronLeft, ChevronRight, CreditCard as CardIcon, Receipt } from "lucide-react";
import { listCreditCards, type CreditCard } from "@/modules/cards/api";
import { listPurchases, cancelPurchase, updatePurchase, type Purchase, type Installment } from "@/modules/purchases/api";
import { listInvoices, invoiceLabel, invoiceStatusLabels, type Invoice } from "@/modules/invoices/api";
import { listAccounts, type Account } from "@/modules/accounts/api";
import { CreateCardModal } from "@/modules/cards/CreateCardModal";
import { CreatePurchaseModal } from "@/modules/purchases/CreatePurchaseModal";
import { PayInvoiceModal } from "@/modules/invoices/PayInvoiceModal";
import { CardTile } from "@/modules/cards/CardTile";
import { Toast, useToast } from "@/components/shared/Toast";
import { Skeleton } from "@/components/shared/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";

interface InvoiceLineItem {
  purchase: Purchase;
  installment: Installment;
}

/** (ano, mês) da competência de `ref`: sempre o próprio mês civil de `ref`
 * (mesma regra do backend em `invoice_service.reference_period_for`) — o
 * dia de fechamento do cartão não desloca isso, só define em que dia do
 * mês seguinte essa fatura fecha/vence. `closingDay` fica no parâmetro só
 * por simetria com o backend (hoje não é usado aqui). */
function referencePeriodFor(_closingDay: number, ref: Date): { year: number; month: number } {
  return { year: ref.getFullYear(), month: ref.getMonth() + 1 };
}

function lineItemMeta(item: InvoiceLineItem): string {
  const { purchase: p, installment: inst } = item;
  const base = p.is_recurring
    ? `recorrente · todo dia ${p.recurring_day}`
    : p.installments_count > 1
    ? `parcela ${inst.installment_number}/${inst.total_installments}`
    : "à vista";
  // Purchase cancelada mas essa parcela específica já tinha sido paga — o
  // tag "cancelada" no título cobre só a parcela em si, então deixa claro
  // que a compra como um todo foi encerrada.
  return p.status === "cancelled" && inst.status !== "cancelled" ? `${base} · compra cancelada` : base;
}

export function CardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  // null = segue a fatura "atual" (mês corrente) automaticamente; um id
  // explícito significa que o usuário navegou pra outra competência.
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
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
      setSelectedInvoiceId(null); // troca de cartão sempre volta pra fatura atual dele
      loadCardDetails(selectedCardId);
    }
  }, [selectedCardId]);

  const selectedCard = cards.find((c) => c.id === selectedCardId);

  const sortedInvoices = [...invoices].sort(
    (a, b) => a.reference_year - b.reference_year || a.reference_month - b.reference_month
  );

  function findInvoiceFor(year: number, month: number) {
    return sortedInvoices.find((i) => i.reference_year === year && i.reference_month === month);
  }

  // A fatura "atual" é a da competência aberta hoje, pela regra de
  // fechamento do cartão — não necessariamente o mês civil de hoje (se o
  // cartão fecha dia 9 e hoje é dia 15, a competência atual já é a do mês
  // seguinte). Se ela já foi paga (usuário adiantou o pagamento), a
  // próxima assume o posto.
  const today = new Date();
  let currentInvoice: Invoice | undefined;
  if (selectedCard) {
    const { year: curYear, month: curMonth } = referencePeriodFor(selectedCard.closing_day, today);
    currentInvoice = findInvoiceFor(curYear, curMonth);
    if (currentInvoice?.status === "paid") {
      const idx = sortedInvoices.findIndex((i) => i.id === currentInvoice!.id);
      currentInvoice = sortedInvoices[idx + 1];
    }
  }
  // Fallback: se ainda não existe fatura gerada para a competência atual
  // ainda (nenhuma compra lançada neste ciclo), cai para a primeira em aberto.
  if (!currentInvoice) {
    currentInvoice = sortedInvoices.find((i) => i.status !== "paid");
  }

  // Fatura exibida: a selecionada manualmente (navegação/seletor) ou, por
  // padrão, a atual do cartão.
  const displayedInvoice = selectedInvoiceId
    ? sortedInvoices.find((i) => i.id === selectedInvoiceId) ?? currentInvoice
    : currentInvoice;
  const displayedIndex = displayedInvoice
    ? sortedInvoices.findIndex((i) => i.id === displayedInvoice!.id)
    : -1;

  function goToInvoiceIndex(idx: number) {
    const inv = sortedInvoices[idx];
    if (inv) setSelectedInvoiceId(inv.id);
  }

  // Lançamentos (parcelas) que caem na fatura exibida, com o valor daquela
  // competência especificamente — não o total da compra. A ordem segue a
  // ordem de lançamento das compras (já vem assim da API).
  const invoiceLineItems: InvoiceLineItem[] = displayedInvoice
    ? purchases.flatMap((p) =>
        p.installments
          .filter((inst) => inst.invoice_id === displayedInvoice!.id)
          .map((inst) => ({ purchase: p, installment: inst }))
      )
    : [];

  function installmentAmount(p: Purchase): number {
    return p.installments[0] ? parseFloat(p.installments[0].amount) : parseFloat(p.total_amount) / p.installments_count;
  }

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
          {cards.length > 1 && (
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
          )}

          {selectedCard && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl text-ink dark:text-paper">{selectedCard.name}</h3>
                  <button
                    onClick={() => setEditingCard(selectedCard)}
                    title="Editar cartão"
                    className="text-olive hover:text-ink dark:hover:text-paper transition"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="flex items-center gap-2 rounded-card bg-clay hover:bg-clay-soft text-white text-sm font-medium px-4 py-2.5 transition"
                >
                  <Plus size={16} />
                  Nova compra
                </button>
              </div>

              {/* Navegador de competência/fatura */}
              {sortedInvoices.length > 0 && displayedInvoice && (
                <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => goToInvoiceIndex(displayedIndex - 1)}
                      disabled={displayedIndex <= 0}
                      className="p-1.5 rounded-card text-olive hover:text-ink dark:hover:text-paper hover:bg-ink/5 dark:hover:bg-paper/5 transition disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Fatura anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <select
                      value={displayedInvoice.id}
                      onChange={(e) => setSelectedInvoiceId(e.target.value)}
                      className="flex-1 min-w-0 rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-3 py-1.5 text-sm font-medium text-ink dark:text-paper outline-none focus:ring-2 focus:ring-emerald transition"
                    >
                      {sortedInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {invoiceLabel(inv)}
                          {inv.id === currentInvoice?.id ? " · atual" : ""}
                          {inv.status === "paid" ? " · paga" : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => goToInvoiceIndex(displayedIndex + 1)}
                      disabled={displayedIndex === -1 || displayedIndex >= sortedInvoices.length - 1}
                      className="p-1.5 rounded-card text-olive hover:text-ink dark:hover:text-paper hover:bg-ink/5 dark:hover:bg-paper/5 transition disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Próxima fatura"
                    >
                      <ChevronRight size={18} />
                    </button>

                    {currentInvoice && displayedInvoice.id !== currentInvoice.id && (
                      <button
                        onClick={() => setSelectedInvoiceId(currentInvoice!.id)}
                        className="text-xs font-medium text-emerald hover:underline shrink-0"
                      >
                        Ir pra atual
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-olive">
                      {invoiceLabel(displayedInvoice)}
                      {displayedInvoice.id === currentInvoice?.id ? " — fatura atual" : ""}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-olive/10 text-olive">
                      {invoiceStatusLabels[displayedInvoice.status]}
                    </span>
                  </div>
                  <p className="num text-3xl text-ink dark:text-paper mb-3">
                    {formatCurrency(displayedInvoice.total_amount)}
                  </p>
                  <div className="flex items-center justify-between text-sm text-olive mb-4">
                    <span>Fechamento: {formatDate(displayedInvoice.closing_date)}</span>
                    <span>Vencimento: {formatDate(displayedInvoice.due_date)}</span>
                  </div>

                  {displayedInvoice.status === "paid" ? (
                    <p className="text-sm text-emerald text-center">
                      Paga{displayedInvoice.paid_at ? ` em ${formatDate(displayedInvoice.paid_at)}` : ""}.
                    </p>
                  ) : (
                    <button
                      onClick={() => setPayingInvoice(displayedInvoice!)}
                      disabled={accounts.length === 0}
                      className="w-full rounded-card bg-emerald hover:bg-emerald-deep text-white text-sm font-medium py-2.5 transition disabled:opacity-50"
                    >
                      Pagar fatura
                    </button>
                  )}
                </div>
              )}

              {/* Lançamentos da fatura selecionada */}
              <div>
                <h4 className="text-sm font-medium text-olive mb-3">
                  Lançamentos{displayedInvoice ? ` — ${invoiceLabel(displayedInvoice)}` : ""}
                </h4>
                {invoiceLineItems.length === 0 ? (
                  <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-8 text-center">
                    <Receipt className="mx-auto text-olive/50 mb-2" size={24} />
                    <p className="text-sm text-olive">
                      {displayedInvoice
                        ? "Nenhum lançamento nesta fatura."
                        : "Nenhuma compra lançada neste cartão ainda."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 divide-y divide-paper-border dark:divide-ink-border shadow-soft">
                    {invoiceLineItems.map(({ purchase: p, installment: inst }) => (
                      <div key={inst.id} className="flex items-center justify-between py-3 group">
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
                            {inst.status === "cancelled" && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-clay/10 text-clay">
                                cancelada
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-olive">{lineItemMeta({ purchase: p, installment: inst })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="num text-sm font-medium text-ink dark:text-paper">
                              {formatCurrency(inst.amount)}
                            </p>
                            {!p.is_recurring && p.installments_count > 1 && (
                              <p className="num text-xs text-olive">de {formatCurrency(installmentAmount(p))}</p>
                            )}
                          </div>
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
          onSaved={(card) => {
            setCards((prev) => [...prev, card]);
            setSelectedCardId(card.id);
            setShowCardModal(false);
            showToast("Cartão criado com sucesso.");
          }}
        />
      )}

      {editingCard && (
        <CreateCardModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSaved={(card) => {
            setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
            setEditingCard(null);
            showToast("Cartão atualizado com sucesso.");
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
