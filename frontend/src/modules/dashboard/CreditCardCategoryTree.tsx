import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { type CardScope, type CreditCardCategoryNode } from "@/modules/dashboard/api";

const FALLBACK_COLOR = "#8B8577";

interface Props {
  nodes: CreditCardCategoryNode[];
  scope: CardScope;
  onScopeChange: (scope: CardScope) => void;
}

export function CreditCardCategoryTree({ nodes, scope, onScopeChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const total = nodes.reduce((acc, n) => acc + parseFloat(n.total), 0);

  return (
    <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-sm font-medium text-olive">Onde vai o dinheiro do cartão</h3>
        <div className="flex rounded-card border border-paper-border dark:border-ink-border overflow-hidden text-xs">
          <button
            onClick={() => onScopeChange("current")}
            className={`px-3 py-1.5 transition ${
              scope === "current"
                ? "bg-emerald text-white"
                : "text-olive hover:text-ink dark:hover:text-paper"
            }`}
          >
            Fatura atual
          </button>
          <button
            onClick={() => onScopeChange("open")}
            className={`px-3 py-1.5 transition ${
              scope === "open"
                ? "bg-emerald text-white"
                : "text-olive hover:text-ink dark:hover:text-paper"
            }`}
          >
            Tudo em aberto
          </button>
        </div>
      </div>

      {nodes.length === 0 ? (
        <p className="text-sm text-olive/70 py-8 text-center">
          Nenhuma compra no cartão neste recorte.
        </p>
      ) : (
        <>
          <p className="num text-2xl text-ink dark:text-paper mb-4">{formatCurrency(total)}</p>
          <div className="space-y-3">
            {nodes.map((node) => {
              const key = node.category_id ?? "__none__";
              const color = node.color ?? FALLBACK_COLOR;
              const isOpen = expanded.has(key);
              const hasChildren = node.children.length > 0;

              return (
                <div key={key}>
                  <button
                    disabled={!hasChildren}
                    onClick={() => toggle(key)}
                    className="w-full group"
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 min-w-0">
                        {hasChildren ? (
                          <ChevronRight
                            size={14}
                            className={`text-olive transition-transform ${isOpen ? "rotate-90" : ""}`}
                          />
                        ) : (
                          <span className="w-[14px]" />
                        )}
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className={`truncate ${
                            node.is_uncategorized ? "text-olive italic" : "text-ink dark:text-paper"
                          }`}
                        >
                          {node.category_name}
                        </span>
                        <span className="text-xs text-olive shrink-0">
                          {node.percentage.toFixed(0)}%
                        </span>
                      </span>
                      <span className="num text-ink dark:text-paper shrink-0">
                        {formatCurrency(node.total)}
                      </span>
                    </div>
                  </button>
                  <div className="h-1.5 rounded-full bg-ink/5 dark:bg-paper/10 overflow-hidden ml-[22px]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${node.percentage}%`, backgroundColor: color }}
                    />
                  </div>

                  {isOpen && hasChildren && (
                    <div className="mt-2 ml-[22px] space-y-2 border-l border-paper-border dark:border-ink-border pl-3">
                      {node.children.map((child) => (
                        <div key={child.category_id ?? child.category_name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-olive truncate">
                              {child.category_name}
                              <span className="ml-1.5 text-olive/70">
                                {child.percentage.toFixed(0)}%
                              </span>
                            </span>
                            <span className="num text-ink dark:text-paper shrink-0">
                              {formatCurrency(child.total)}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-ink/5 dark:bg-paper/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${child.percentage}%`,
                                backgroundColor: color,
                                opacity: 0.65,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
