import { useEffect, useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { listIncomes, deleteIncome, incomeStatusLabels, type Income, type IncomeStatus } from "@/modules/incomes/api";
import { useFormOptions } from "@/modules/transactions/useFormOptions";
import { QuickAddModal } from "@/modules/transactions/QuickAddModal";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { Toast, useToast } from "@/components/shared/Toast";
import { Skeleton } from "@/components/shared/Skeleton";
import { formatCurrency } from "@/lib/format";

const statusTone: Record<IncomeStatus, "positive" | "negative" | "neutral" | "warning"> = {
  received: "positive",
  expected: "neutral",
  late: "warning",
  cancelled: "negative",
};

export function IncomesPage() {
  const { accounts, categories } = useFormOptions();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IncomeStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const { message, showToast } = useToast();

  async function load() {
    setIsLoading(true);
    const data = await listIncomes({
      status: statusFilter || undefined,
      category_id: categoryFilter || undefined,
    });
    setIncomes(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter]);

  async function handleDelete(id: string) {
    await deleteIncome(id);
    setIncomes((prev) => prev.filter((i) => i.id !== id));
    showToast("Receita excluída.");
  }

  const total = incomes
    .filter((i) => i.status === "received")
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-paper">Receitas</h2>
          <p className="text-sm text-olive mt-1">Total recebido: {formatCurrency(total)}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-card bg-emerald hover:bg-emerald-deep text-white text-sm font-medium px-4 py-2.5 transition"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nova receita</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as IncomeStatus | "")}
          className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald"
        >
          <option value="">Todos os status</option>
          {Object.entries(incomeStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald"
        >
          <option value="">Todas as categorias</option>
          {incomeCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : incomes.length === 0 ? (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
          <TrendingUp className="mx-auto text-olive/50 mb-3" size={32} />
          <p className="text-olive">Nenhuma receita encontrada.</p>
        </div>
      ) : (
        <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 divide-y divide-paper-border dark:divide-ink-border shadow-soft">
          {incomes.map((income) => (
            <TransactionRow
              key={income.id}
              description={income.description}
              amount={income.amount}
              date={income.income_date}
              statusLabel={incomeStatusLabels[income.status]}
              statusTone={statusTone[income.status]}
              category={categories.find((c) => c.id === income.category_id)}
              account={accounts.find((a) => a.id === income.account_id)}
              onDelete={() => handleDelete(income.id)}
              sign="+"
            />
          ))}
        </div>
      )}

      {showModal && (
        <QuickAddModal
          initialKind="income"
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            load();
            showToast("Receita adicionada com sucesso.");
          }}
        />
      )}

      <Toast message={message} />
    </div>
  );
}
