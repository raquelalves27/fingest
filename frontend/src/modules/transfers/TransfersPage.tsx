import { useEffect, useState } from "react";
import { Plus, ArrowRightLeft, Trash2 } from "lucide-react";
import { listTransfers, deleteTransfer, type Transfer } from "@/modules/transfers/api";
import { listAccounts, type Account } from "@/modules/accounts/api";
import { CreateTransferModal } from "@/modules/transfers/CreateTransferModal";
import { Toast, useToast } from "@/components/shared/Toast";
import { Skeleton } from "@/components/shared/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";

export function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { message, showToast } = useToast();

  async function load() {
    setIsLoading(true);
    const [transfersData, accountsData] = await Promise.all([listTransfers(), listAccounts()]);
    setTransfers(transfersData);
    setAccounts(accountsData);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    await deleteTransfer(id);
    setTransfers((prev) => prev.filter((t) => t.id !== id));
    showToast("Transferência excluída.");
  }

  function accountName(id: string) {
    return accounts.find((a) => a.id === id)?.name ?? "Conta removida";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-paper">Transferências</h2>
          <p className="text-sm text-olive mt-1">Movimentações entre suas contas.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={accounts.length < 2}
          className="flex items-center gap-2 rounded-card bg-emerald hover:bg-emerald-deep text-white text-sm font-medium px-4 py-2.5 transition disabled:opacity-50"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nova transferência</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : accounts.length < 2 ? (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
          <ArrowRightLeft className="mx-auto text-olive/50 mb-3" size={32} />
          <p className="text-olive">Você precisa de pelo menos duas contas para transferir.</p>
        </div>
      ) : transfers.length === 0 ? (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
          <ArrowRightLeft className="mx-auto text-olive/50 mb-3" size={32} />
          <p className="text-olive">Nenhuma transferência ainda.</p>
        </div>
      ) : (
        <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 divide-y divide-paper-border dark:divide-ink-border shadow-soft">
          {transfers.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3 group">
              <div className="flex items-center gap-3">
                <ArrowRightLeft size={16} className="text-olive flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-ink dark:text-paper">
                    {accountName(t.from_account_id)} → {accountName(t.to_account_id)}
                  </p>
                  <p className="text-xs text-olive">{formatDate(t.transfer_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="num text-sm font-medium text-ink dark:text-paper">
                  {formatCurrency(t.amount)}
                </span>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-olive hover:text-clay transition"
                  aria-label="Excluir"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateTransferModal
          accounts={accounts}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            load();
            showToast("Transferência realizada com sucesso.");
          }}
        />
      )}

      <Toast message={message} />
    </div>
  );
}
