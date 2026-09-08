import { api } from "@/lib/api";
import { type Expense } from "@/modules/expenses/api";
import { type Income } from "@/modules/incomes/api";

export interface PayableSummary {
  overdue_total: string;
  due_today_total: string;
  due_next_7_days_total: string;
  due_next_30_days_total: string;
  overdue: Expense[];
  due_today: Expense[];
  upcoming: Expense[];
}

export interface ReceivableSummary {
  overdue_total: string;
  due_today_total: string;
  due_next_7_days_total: string;
  due_next_30_days_total: string;
  overdue: Income[];
  due_today: Income[];
  upcoming: Income[];
}

export async function getPayables(): Promise<PayableSummary> {
  const { data } = await api.get<PayableSummary>("/payables/expenses");
  return data;
}

export async function getReceivables(): Promise<ReceivableSummary> {
  const { data } = await api.get<ReceivableSummary>("/payables/incomes");
  return data;
}
