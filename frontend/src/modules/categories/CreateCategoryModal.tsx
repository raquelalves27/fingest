import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createCategory, colorForIndex, type Category, type CategoryType } from "@/modules/categories/api";

interface Props {
  existingCategories: Category[];
  onClose: () => void;
  onCreated: (category: Category) => void;
}

export function CreateCategoryModal({ existingCategories, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [parentId, setParentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = existingCategories.filter((c) => c.type === type && !c.parent_id);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const category = await createCategory({
        name,
        type,
        parent_id: parentId || undefined,
        color: colorForIndex(existingCategories.length),
      });
      onCreated(category);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Não foi possível criar a categoria.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full md:max-w-md rounded-t-card md:rounded-card bg-paper-soft dark:bg-ink-soft border border-paper-border dark:border-ink-border p-6 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-ink dark:text-paper">Nova categoria</h3>
          <button onClick={onClose} className="text-olive hover:text-ink dark:hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setType("expense"); setParentId(""); }}
              className={`rounded-card py-2.5 text-sm font-medium border transition ${
                type === "expense" ? "border-clay bg-clay/10 text-clay" : "border-paper-border dark:border-ink-border text-olive"
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => { setType("income"); setParentId(""); }}
              className={`rounded-card py-2.5 text-sm font-medium border transition ${
                type === "income" ? "border-emerald bg-emerald/10 text-emerald" : "border-paper-border dark:border-ink-border text-olive"
              }`}
            >
              Receita
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alimentação"
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
            />
          </div>

          {parentOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5">
                Categoria pai (opcional — cria uma subcategoria)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper dark:bg-ink px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald transition"
              >
                <option value="">Nenhuma — categoria principal</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-clay bg-clay/10 rounded-card px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-card bg-emerald hover:bg-emerald-deep text-white font-medium py-2.5 transition disabled:opacity-60"
          >
            {isSubmitting ? "Salvando…" : "Criar categoria"}
          </button>
        </form>
      </div>
    </div>
  );
}
