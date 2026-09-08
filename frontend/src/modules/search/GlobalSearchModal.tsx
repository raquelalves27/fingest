import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X, TrendingUp, TrendingDown, CreditCard, Wallet, ShoppingBag } from "lucide-react";
import { search, type SearchResult } from "@/modules/search/api";

const ICONS: Record<SearchResult["type"], typeof SearchIcon> = {
  income: TrendingUp,
  expense: TrendingDown,
  purchase: ShoppingBag,
  account: Wallet,
  credit_card: CreditCard,
};

export function GlobalSearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      const data = await search(query);
      setResults(data);
      setIsSearching(false);
    }, 300); // debounce
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center bg-ink/40 backdrop-blur-sm pt-20 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-card bg-paper-soft dark:bg-ink-soft border border-paper-border dark:border-ink-border shadow-soft overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-paper-border dark:border-ink-border">
          <SearchIcon size={18} className="text-olive flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar em receitas, despesas, contas, cartões…"
            className="flex-1 bg-transparent outline-none text-sm text-ink dark:text-paper placeholder:text-olive"
          />
          <button onClick={onClose} className="text-olive hover:text-ink dark:hover:text-paper flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isSearching ? (
            <p className="text-sm text-olive text-center py-8">Buscando…</p>
          ) : query.trim().length >= 2 && results.length === 0 ? (
            <p className="text-sm text-olive text-center py-8">Nenhum resultado para "{query}".</p>
          ) : (
            results.map((r) => {
              const Icon = ICONS[r.type];
              return (
                <div key={`${r.type}-${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink/5 dark:hover:bg-paper/5">
                  <Icon size={16} className="text-olive flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink dark:text-paper truncate">{r.title}</p>
                    <p className="text-xs text-olive truncate">{r.subtitle}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
