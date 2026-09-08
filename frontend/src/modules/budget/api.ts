import { api } from "@/lib/api";

export interface BudgetCategoryResult {
  category_id: string;
  category_name: string;
  color: string | null;
  planned_amount: string;
  spent_amount: string;
  available_amount: string;
  percentage_used: number;
}

export interface Budget {
  reference_month: number;
  reference_year: number;
  categories: BudgetCategoryResult[];
}

export interface BudgetSetPayload {
  reference_month: number;
  reference_year: number;
  categories: { category_id: string; planned_amount: string }[];
}

export async function getBudget(month: number, year: number): Promise<Budget> {
  const { data } = await api.get<Budget>("/budgets", { params: { month, year } });
  return data;
}

export async function setBudget(payload: BudgetSetPayload): Promise<Budget> {
  const { data } = await api.put<Budget>("/budgets", payload);
  return data;
}
