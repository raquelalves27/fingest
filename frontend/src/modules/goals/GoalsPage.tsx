import { useEffect, useState } from "react";
import { Plus, Target, Trash2, PlusCircle } from "lucide-react";
import { listGoals, deleteGoal, type Goal } from "@/modules/goals/api";
import { listAccounts, type Account } from "@/modules/accounts/api";
import { CreateGoalModal } from "@/modules/goals/CreateGoalModal";
import { AddContributionModal } from "@/modules/goals/AddContributionModal";
import { Toast, useToast } from "@/components/shared/Toast";
import { Skeleton } from "@/components/shared/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contributingGoal, setContributingGoal] = useState<Goal | null>(null);
  const { message, showToast } = useToast();

  async function load() {
    setIsLoading(true);
    const [goalsData, accountsData] = await Promise.all([listGoals(), listAccounts()]);
    setGoals(goalsData);
    setAccounts(accountsData);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    showToast("Meta excluída.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-paper">Metas</h2>
          <p className="text-sm text-olive mt-1">O que você está guardando dinheiro para conquistar.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-card bg-emerald hover:bg-emerald-deep text-white text-sm font-medium px-4 py-2.5 transition"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nova meta</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
          <Target className="mx-auto text-olive/50 mb-3" size={32} />
          <p className="text-olive">Nenhuma meta ainda. Que tal criar uma?</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const pct = Math.min(100, goal.progress_percentage);
            return (
              <div key={goal.id} className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-paper">{goal.name}</p>
                    {goal.target_date && (
                      <p className="text-xs text-olive">Até {formatDate(goal.target_date)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="opacity-0 group-hover:opacity-100 text-olive hover:text-clay transition"
                    aria-label="Excluir meta"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <p className="num text-2xl text-ink dark:text-paper mb-1">{formatCurrency(goal.saved_amount)}</p>
                <p className="text-xs text-olive mb-3">de {formatCurrency(goal.target_amount)}</p>

                <div className="h-1.5 rounded-full bg-ink/5 dark:bg-paper/10 overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full ${goal.status === "completed" ? "bg-emerald" : "bg-emerald/70"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-olive mb-3">
                  <span>{goal.progress_percentage.toFixed(0)}%</span>
                  {goal.status === "completed" && <span className="text-emerald font-medium">Concluída! 🎉</span>}
                </div>

                {goal.status === "active" && (
                  <button
                    onClick={() => setContributingGoal(goal)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-card border border-emerald text-emerald hover:bg-emerald/5 text-sm font-medium py-2 transition"
                  >
                    <PlusCircle size={14} />
                    Registrar aporte
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateGoalModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(goal) => {
            setGoals((prev) => [goal, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}

      {contributingGoal && (
        <AddContributionModal
          goal={contributingGoal}
          accounts={accounts}
          onClose={() => setContributingGoal(null)}
          onAdded={() => {
            setContributingGoal(null);
            load();
            showToast("Aporte registrado com sucesso.");
          }}
        />
      )}

      <Toast message={message} />
    </div>
  );
}
