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

// --- Painel de cartões de crédito ---

export type CardHealth = "ok" | "attention" | "critical";
export type CardScope = "current" | "open";

export interface CreditCardInvoiceBrief {
  id: string;
  label: string;
  reference_month: number;
  reference_year: number;
  total: string;
  status: "open" | "closed" | "paid";
  closing_date: string;
  due_date: string;
  days_until_due: number;
}

export interface CreditCardPanel {
  id: string;
  name: string;
  color: string | null;
  brand: string | null;
  last_four_digits: string | null;
  closing_day: number;
  due_day: number;
  credit_limit: string;
  used_limit: string;
  available_limit: string;
  utilization_pct: number;
  current_invoice: CreditCardInvoiceBrief | null;
  next_invoice_total: string;
  recurring_monthly_total: string;
  health: CardHealth;
}

export interface CreditCardCategoryChild {
  category_id: string | null;
  category_name: string;
  total: string;
  percentage: number;
}

export interface CreditCardCategoryNode {
  category_id: string | null;
  category_name: string;
  color: string | null;
  total: string;
  percentage: number;
  is_uncategorized: boolean;
  children: CreditCardCategoryChild[];
}

export interface CreditCardTrendPoint {
  label: string;
  total: string;
  paid: string;
  pending: string;
}

export interface CreditCardTotals {
  credit_limit: string;
  used_limit: string;
  available_limit: string;
  utilization_pct: number;
  current_invoices_total: string;
  future_committed_total: string;
  recurring_monthly_total: string;
  spend_change_pct: number | null;
}

export interface CreditCardDashboardInsight {
  level: "info" | "attention" | "critical";
  text: string;
}

export interface CreditCardDashboard {
  scope: CardScope;
  totals: CreditCardTotals;
  cards: CreditCardPanel[];
  category_breakdown: CreditCardCategoryNode[];
  trend: CreditCardTrendPoint[];
  insights: CreditCardDashboardInsight[];
}

export async function getCreditCardDashboard(
  scope: CardScope = "current",
  months = 6,
): Promise<CreditCardDashboard> {
  const { data } = await api.get<CreditCardDashboard>("/dashboard/credit-cards", {
    params: { scope, months },
  });
  return data;
}
