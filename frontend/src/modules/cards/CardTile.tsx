import { CreditCard as CardIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { type CreditCard } from "@/modules/cards/api";

interface Props {
  card: CreditCard;
  isSelected: boolean;
  onClick: () => void;
}

export function CardTile({ card, isSelected, onClick }: Props) {
  const usedPct = Math.min(
    100,
    Math.max(0, ((parseFloat(card.credit_limit) - parseFloat(card.available_limit)) / parseFloat(card.credit_limit)) * 100)
  );

  return (
    <button
      onClick={onClick}
      className={`text-left rounded-card border p-5 shadow-soft transition ${
        isSelected
          ? "border-emerald bg-emerald/5"
          : "border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft hover:border-emerald/50"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: card.color ?? "#8B8577" }}
          >
            <CardIcon size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-ink dark:text-paper">{card.name}</p>
            {card.last_four_digits && (
              <p className="text-xs text-olive">•••• {card.last_four_digits}</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-olive">Limite disponível</p>
      <p className="num text-xl text-ink dark:text-paper mb-3">{formatCurrency(card.available_limit)}</p>

      <div className="h-1.5 rounded-full bg-ink/5 dark:bg-paper/10 overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full bg-clay"
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <p className="text-xs text-olive">de {formatCurrency(card.credit_limit)}</p>
    </button>
  );
}
