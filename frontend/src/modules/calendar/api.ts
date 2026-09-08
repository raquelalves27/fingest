import { api } from "@/lib/api";

export interface CalendarEntry {
  type: "income" | "expense" | "invoice" | "goal";
  id: string;
  description: string;
  amount: string;
}

export interface CalendarDay {
  day: string;
  has_income: boolean;
  has_expense: boolean;
  has_invoice: boolean;
  entries: CalendarEntry[];
}

export async function getCalendar(month: number, year: number): Promise<CalendarDay[]> {
  const { data } = await api.get<{ days: CalendarDay[] }>("/calendar", { params: { month, year } });
  return data.days;
}
