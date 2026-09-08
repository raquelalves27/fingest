import { useEffect, useState } from "react";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { listRecurring, deleteRecurring, frequencyLabels, type RecurringTransaction } from "@/modules/recurring/api";
import { CreateRecurringModal } from "@/modules/recurring/CreateRecurringModal";
import { Toast, useToast } from "@/components/shared/Toast";
import { Skeleton } from "@/components/shared/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";

export function RecurringPage() {
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { message, showToast } = useToast();

  async function load() {
    setIsLoading(true);
    setItems(await listRecurring());
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    await deleteRecurring(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    showToast("Recorrência desativada.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-paper">Recorrências</h2>
          <p className="text-sm text-olive mt-1">Assinaturas, aluguel, salário — o que se repete todo período.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-card bg-emerald hover:bg-emerald-deep text-white text-sm font-medium px-4 py-2.5 transition"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nova recorrência</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
          <Repeat className="mx-auto text-olive/50 mb-3" size={32} />
          <p className="text-olive">Nenhuma recorrência cadastrada ainda.</p>
        </div>
      ) : (
        <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 divide-y divide-paper-border dark:divide-ink-border shadow-soft">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 group">
              <div className="flex items-center gap-3">
                <Repeat size={16} className="text-olive flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-ink dark:text-paper">{item.description}</p>
                  <p className="text-xs text-olive">
                    {frequencyLabels[item.frequency]}
                    {item.next_occurrence_date ? ` · próxima em ${formatDate(item.next_occurrence_date)}` : ""}
                    {!item.is_active ? " · inativa" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`num text-sm font-medium ${item.type === "income" ? "text-emerald" : "text-ink dark:text-paper"}`}>
                  {item.type === "income" ? "+" : "-"} {formatCurrency(item.amount)}
                </span>
                {item.is_active && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-olive hover:text-clay transition"
                    aria-label="Desativar"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateRecurringModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            load();
            showToast("Recorrência criada com sucesso.");
          }}
        />
      )}

      <Toast message={message} />
    </div>
  );
}
