import { useEffect, useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { listCategories, deleteCategory, type Category } from "@/modules/categories/api";
import { CreateCategoryModal } from "@/modules/categories/CreateCategoryModal";
import { Skeleton } from "@/components/shared/Skeleton";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setIsLoading(true);
    const data = await listCategories();
    setCategories(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
  }

  const expenseRoots = categories.filter((c) => c.type === "expense" && !c.parent_id);
  const incomeRoots = categories.filter((c) => c.type === "income" && !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);

  function renderGroup(title: string, roots: Category[]) {
    return (
      <div>
        <h3 className="text-sm font-medium text-olive mb-3">{title}</h3>
        {roots.length === 0 ? (
          <p className="text-sm text-olive/60">Nenhuma categoria ainda.</p>
        ) : (
          <div className="space-y-2">
            {roots.map((cat) => (
              <div key={cat.id} className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-3 shadow-soft">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color ?? "#8B8577" }} />
                    <span className="text-sm font-medium text-ink dark:text-paper">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="opacity-0 group-hover:opacity-100 text-olive hover:text-clay transition"
                    aria-label="Excluir categoria"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {childrenOf(cat.id).length > 0 && (
                  <div className="mt-2 pl-4 space-y-1.5 border-l border-paper-border dark:border-ink-border">
                    {childrenOf(cat.id).map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between text-sm text-olive group">
                        <span>{sub.name}</span>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-clay transition"
                          aria-label="Excluir subcategoria"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-paper">Categorias</h2>
          <p className="text-sm text-olive mt-1">Organize suas receitas e despesas.</p>
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
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-card border border-dashed border-paper-border dark:border-ink-border p-12 text-center">
          <Tag className="mx-auto text-olive/50 mb-3" size={32} />
          <p className="text-olive">Nenhuma categoria criada ainda.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {renderGroup("Despesas", expenseRoots)}
          {renderGroup("Receitas", incomeRoots)}
        </div>
      )}

      {showModal && (
        <CreateCategoryModal
          existingCategories={categories}
          onClose={() => setShowModal(false)}
          onCreated={(cat) => {
            setCategories((prev) => [...prev, cat]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
