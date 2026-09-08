import { useEffect, useState } from "react";
import { Plus, TrendingDown } from "lucide-react";
import { listExpenses, deleteExpense, expenseStatusLabels, type Expense, type ExpenseStatus } from "@/modules/expenses/api";
import { useFormOptions } from "@/modules/transactions/useFormOptions";
import { QuickAddModal } from "@/modules/transactions/QuickAddModal";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { Toast, useToast } from "@/components/shared/Toast";
import { Skeleton } from "@/components/shared/Skeleton";
import { formatCurrency } from "@/lib/format";

const statusTone: Record<ExpenseStatus, "positive" | "negative" | "neutral" | "warning"> = {
  paid: "neutral",
  pending: "neutral",
  late: "warning",
  cancelled: "negative",
};

export function ExpensesPage() {
  const { accounts, categories } = useFormOptions();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const { message, showToast } = useToast();

  async function load() {
    setIsLoading(true);
    const data = await listExpenses({
      status: statusFilter || undefined,
      category_id: categoryFilter || undefined,
    });
    setExpenses(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter]);

  async function handleDelete(id: string) {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast("Despesa excluída.");
  }

  const total = expenses
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-paper">Despesas</h2>
          <p className="text-sm text-olive mt-1">Total pago: {formatCurrency(total)}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-card bg-clay hover:bg-clay-soft text-white text-sm font-medium px-4 py-2.5 transition"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nova despesa</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | "")}
          className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald"
        >
          <option value="">Todos os status</option>
          {Object.entries(expenseStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald"
        >
          <option value="">Todas as categorias</option>
          {expenseCategories.map((c) => (
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
      ) : expenses.length === 0 ? (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
          <TrendingDown className="mx-auto text-olive/50 mb-3" size={32} />
          <p className="text-olive">Nenhuma despesa encontrada.</p>
        </div>
      ) : (
        <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 divide-y divide-paper-border dark:divide-ink-border shadow-soft">
          {expenses.map((expense) => (
            <TransactionRow
              key={expense.id}
              description={expense.description}
              amount={expense.amount}
              date={expense.expense_date}
              statusLabel={expenseStatusLabels[expense.status]}
              statusTone={statusTone[expense.status]}
              category={categories.find((c) => c.id === expense.category_id)}
              account={accounts.find((a) => a.id === expense.account_id)}
              onDelete={() => handleDelete(expense.id)}
              sign="-"
            />
          ))}
        </div>
      )}

      {showModal && (
        <QuickAddModal
          initialKind="expense"
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            load();
            showToast("Despesa adicionada com sucesso.");
          }}
        />
      )}

      <Toast message={message} />
    </div>
  );
}
