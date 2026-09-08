import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCalendar, type CalendarDay } from "@/modules/calendar/api";
import { Skeleton } from "@/components/shared/Skeleton";
import { formatCurrency } from "@/lib/format";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function CalendarPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setDays(await getCalendar(month, year));
      setIsLoading(false);
    }
    load();
  }, [month, year]);

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDay(null);
  }

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const dayByDate = new Map(days.map((d) => [d.day, d]));
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selected = selectedDay ? dayByDate.get(selectedDay) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-ink dark:text-paper">Calendário</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-card hover:bg-ink/5 dark:hover:bg-paper/5">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-ink dark:text-paper w-32 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-card hover:bg-ink/5 dark:hover:bg-paper/5">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-4 shadow-soft">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAY_LABELS.map((w, i) => (
              <div key={i} className="text-center text-xs text-olive font-medium py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((dayNum, idx) => {
              if (dayNum === null) return <div key={idx} />;
              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const entry = dayByDate.get(dateStr);
              const isSelected = selectedDay === dateStr;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`aspect-square rounded-card flex flex-col items-center justify-center text-xs transition ${
                    isSelected ? "bg-emerald text-white" : "hover:bg-ink/5 dark:hover:bg-paper/5 text-ink dark:text-paper"
                  }`}
                >
                  <span>{dayNum}</span>
                  {entry && (
                    <span className="flex gap-0.5 mt-0.5">
                      {entry.has_income && <span className="w-1 h-1 rounded-full bg-emerald-bright" />}
                      {entry.has_expense && <span className="w-1 h-1 rounded-full bg-clay" />}
                      {entry.has_invoice && <span className="w-1 h-1 rounded-full bg-blue-400" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
          <h3 className="text-sm font-medium text-olive mb-3">
            {new Date(selected.day + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
          </h3>
          <div className="space-y-2">
            {selected.entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <span className="text-ink dark:text-paper">{entry.description}</span>
                <span className={`num ${entry.type === "income" ? "text-emerald" : "text-ink dark:text-paper"}`}>
                  {formatCurrency(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
