import { api } from "@/lib/api";

export type ExpenseStatus = "pending" | "paid" | "late" | "cancelled";

export interface Expense {
  id: string;
  description: string;
  amount: string;
  expense_date: string;
  account_id: string | null;
  category_id: string | null;
  payment_method: string | null;
  status: ExpenseStatus;
  notes: string | null;
}

export interface ExpenseCreatePayload {
  description: string;
  amount: string;
  expense_date: string;
  account_id?: string;
  category_id?: string;
  payment_method?: string;
  status: ExpenseStatus;
}

export interface ExpenseFilters {
  start_date?: string;
  end_date?: string;
  category_id?: string;
  account_id?: string;
  status?: ExpenseStatus;
}

export const expenseStatusLabels: Record<ExpenseStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  late: "Atrasado",
  cancelled: "Cancelado",
};

export async function listExpenses(filters: ExpenseFilters = {}): Promise<Expense[]> {
  const { data } = await api.get<Expense[]>("/expenses", { params: filters });
  return data;
}

export async function createExpense(payload: ExpenseCreatePayload): Promise<Expense> {
  const { data } = await api.post<Expense>("/expenses", payload);
  return data;
}

export async function updateExpense(id: string, payload: Partial<ExpenseCreatePayload>): Promise<Expense> {
  const { data } = await api.put<Expense>(`/expenses/${id}`, payload);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`/expenses/${id}`);
}
