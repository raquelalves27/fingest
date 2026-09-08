import { type ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Wallet, Moon, Sun, LogOut, TrendingUp, TrendingDown, Tag, Plus, CreditCard,
  ArrowRightLeft, Repeat, PiggyBank, CalendarClock, Target, Calendar, BarChart3, Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { QuickAddModal } from "@/modules/transactions/QuickAddModal";
import { GlobalSearchModal } from "@/modules/search/GlobalSearchModal";
import { Toast, useToast } from "@/components/shared/Toast";

// Agrupada em seções para não virar uma lista solta de 13 itens.
const navGroups = [
  {
    label: null,
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Dinheiro",
    items: [
      { to: "/accounts", label: "Contas", icon: Wallet },
      { to: "/cards", label: "Cartões", icon: CreditCard },
      { to: "/transfers", label: "Transferências", icon: ArrowRightLeft },
    ],
  },
  {
    label: "Lançamentos",
    items: [
      { to: "/incomes", label: "Receitas", icon: TrendingUp },
      { to: "/expenses", label: "Despesas", icon: TrendingDown },
      { to: "/recurring", label: "Recorrências", icon: Repeat },
      { to: "/categories", label: "Categorias", icon: Tag },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { to: "/budget", label: "Orçamento", icon: PiggyBank },
      { to: "/payables", label: "A pagar/receber", icon: CalendarClock },
      { to: "/goals", label: "Metas", icon: Target },
    ],
  },
  {
    label: "Visão geral",
    items: [
      { to: "/calendar", label: "Calendário", icon: Calendar },
      { to: "/reports", label: "Relatórios", icon: BarChart3 },
    ],
  },
];

// Rotas visíveis na bottom nav do mobile — um subconjunto para não lotar a barra.
const mobileNavItems = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/cards", label: "Cartões", icon: CreditCard },
  { to: "/expenses", label: "Despesas", icon: TrendingDown },
  { to: "/accounts", label: "Contas", icon: Wallet },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { message, showToast } = useToast();

  // Atalho "/" para busca global (seção 31 do escopo), ignorado quando o
  // foco já está em um campo de texto para não atrapalhar a digitação.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        setShowSearch(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleCreated() {
    setShowQuickAdd(false);
    showToast("Lançamento adicionado com sucesso.");
    // Forma simples e robusta de refletir o novo lançamento em qualquer tela
    // sem precisar de um estado global: recarrega a página atual, que
    // sempre busca os dados na montagem.
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-ink text-ink dark:text-paper">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft overflow-y-auto">
        <div className="px-6 py-6 flex items-center justify-between">
          <h1 className="font-display text-2xl">Fingest</h1>
          <button
            onClick={() => setShowSearch(true)}
            className="p-1.5 rounded-card text-olive hover:bg-ink/5 dark:hover:bg-paper/5"
            aria-label="Buscar"
            title="Buscar (atalho: /)"
          >
            <Search size={17} />
          </button>
        </div>

        <div className="px-3 mb-3">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="w-full flex items-center justify-center gap-2 rounded-card bg-emerald hover:bg-emerald-deep text-white text-sm font-medium py-2.5 transition"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-4 pb-4">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {group.label && (
                <p className="px-3 text-xs font-medium text-olive/70 uppercase tracking-wide mb-1">{group.label}</p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-emerald/10 text-emerald"
                          : "text-olive hover:bg-ink/5 dark:hover:bg-paper/5"
                      }`
                    }
                  >
                    <item.icon size={17} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-3 pb-6 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium text-olive hover:bg-ink/5 dark:hover:bg-paper/5 transition"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            {theme === "light" ? "Modo escuro" : "Modo claro"}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium text-olive hover:bg-ink/5 dark:hover:bg-paper/5 transition"
          >
            <LogOut size={18} />
            Sair
          </button>
          {user && (
            <p className="px-3 pt-2 text-xs text-olive/70 truncate">{user.email}</p>
          )}
        </div>
      </aside>

      {/* Topbar — mobile */}
      <header className="md:hidden sticky top-0 z-10 flex items-center justify-between border-b border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 py-4">
        <h1 className="font-display text-xl">Fingest</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSearch(true)} className="p-2 rounded-card hover:bg-ink/5 dark:hover:bg-paper/5" aria-label="Buscar">
            <Search size={20} />
          </button>
          <NavLink
            to="/categories"
            className={({ isActive }) =>
              `p-2 rounded-card hover:bg-ink/5 dark:hover:bg-paper/5 ${isActive ? "text-emerald" : ""}`
            }
            aria-label="Categorias"
          >
            <Tag size={20} />
          </NavLink>
          <button onClick={toggleTheme} className="p-2 rounded-card hover:bg-ink/5 dark:hover:bg-paper/5">
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="md:ml-64 pb-24 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
      </main>

      {/* FAB — mobile */}
      <button
        onClick={() => setShowQuickAdd(true)}
        className="md:hidden fixed bottom-20 right-4 z-10 w-14 h-14 rounded-full bg-emerald hover:bg-emerald-deep text-white shadow-soft flex items-center justify-center"
        aria-label="Adicionar lançamento"
      >
        <Plus size={24} />
      </button>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 flex border-t border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                isActive ? "text-emerald" : "text-olive"
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-olive"
        >
          <LogOut size={20} />
          Sair
        </button>
      </nav>

      {showQuickAdd && (
        <QuickAddModal onClose={() => setShowQuickAdd(false)} onCreated={handleCreated} />
      )}

      {showSearch && <GlobalSearchModal onClose={() => setShowSearch(false)} />}

      <Toast message={message} />
    </div>
  );
}
