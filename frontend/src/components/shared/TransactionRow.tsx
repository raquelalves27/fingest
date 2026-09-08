import { Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { type Category } from "@/modules/categories/api";
import { type Account } from "@/modules/accounts/api";

interface TransactionRowProps {
  description: string;
  amount: string;
  date: string;
  statusLabel: string;
  statusTone: "positive" | "negative" | "neutral" | "warning";
  category?: Category;
  account?: Account;
  onDelete: () => void;
  sign: "+" | "-";
}

const toneClasses: Record<TransactionRowProps["statusTone"], string> = {
  positive: "bg-emerald/10 text-emerald",
  negative: "bg-clay/10 text-clay",
  neutral: "bg-olive/10 text-olive",
  warning: "bg-clay/10 text-clay",
};

export function TransactionRow({
  description, amount, date, statusLabel, statusTone, category, account, onDelete, sign,
}: TransactionRowProps) {
  return (
    <div className="flex items-center justify-between py-3 px-1 group">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: category?.color ?? "#8B8577" }}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink dark:text-paper truncate">{description}</p>
          <p className="text-xs text-olive">
            {formatDate(date)}
            {category ? ` · ${category.name}` : ""}
            {account ? ` · ${account.name}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full ${toneClasses[statusTone]}`}>
          {statusLabel}
        </span>
        <span className={`num text-sm font-medium ${sign === "+" ? "text-emerald" : "text-ink dark:text-paper"}`}>
          {sign} {formatCurrency(amount)}
        </span>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-olive hover:text-clay transition"
          aria-label="Excluir"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
