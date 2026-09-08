import { api } from "@/lib/api";

export interface DashboardSummary {
  total_balance: string;
  monthly_income: string;
  monthly_expenses: string;
  projected_balance: string;
  current_invoices_total: string;
  accounts_payable_total: string;
  accounts_receivable_total: string;
  income_change_pct: number | null;
  expense_change_pct: number | null;
}

export interface CashFlowPoint {
  label: string;
  income: string;
  expense: string;
  balance: string;
}

export interface CategoryBreakdownItem {
  category_id: string | null;
  category_name: string;
  color: string | null;
  total: string;
  percentage: number;
}

export async function getSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>("/dashboard/summary");
  return data;
}

export async function getCashFlow(months = 6): Promise<CashFlowPoint[]> {
  const { data } = await api.get<{ points: CashFlowPoint[] }>("/dashboard/cash-flow", {
    params: { months },
  });
  return data.points;
}

export async function getCategoryBreakdown(): Promise<CategoryBreakdownItem[]> {
  const { data } = await api.get<{ items: CategoryBreakdownItem[] }>("/dashboard/category-breakdown");
  return data.items;
}
