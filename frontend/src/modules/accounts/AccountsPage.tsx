import { useEffect, useState } from "react";
import { Plus, Wallet as WalletIcon, Trash2 } from "lucide-react";
import { listAccounts, deleteAccount, accountTypeLabels, type Account } from "@/modules/accounts/api";
import { CreateAccountModal } from "@/modules/accounts/CreateAccountModal";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/shared/Skeleton";

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setIsLoading(true);
    const data = await listAccounts();
    setAccounts(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    await deleteAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.current_balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-paper">Contas</h2>
          <p className="text-sm text-olive mt-1">
            {accounts.length > 0
              ? `Saldo consolidado: ${formatCurrency(totalBalance)}`
              : "Nenhuma conta cadastrada ainda."}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-card bg-emerald hover:bg-emerald-deep text-white text-sm font-medium px-4 py-2.5 transition"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Adicionar</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
          <WalletIcon className="mx-auto text-olive/50 mb-3" size={32} />
          <p className="text-olive">Adicione sua primeira conta para começar a acompanhar seu saldo.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-olive">{account.bank || accountTypeLabels[account.type]}</p>
                  <h3 className="font-medium text-ink dark:text-paper mt-0.5">{account.name}</h3>
                </div>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="opacity-0 group-hover:opacity-100 text-olive hover:text-clay transition"
                  aria-label="Excluir conta"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="num text-2xl text-ink dark:text-paper mt-4">
                {formatCurrency(account.current_balance)}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateAccountModal
          onClose={() => setShowModal(false)}
          onCreated={(account) => {
            setAccounts((prev) => [...prev, account]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
