import { api } from "@/lib/api";

export type IncomeStatus = "expected" | "received" | "late" | "cancelled";

export interface Income {
  id: string;
  description: string;
  amount: string;
  income_date: string;
  account_id: string | null;
  category_id: string | null;
  status: IncomeStatus;
  notes: string | null;
}

export interface IncomeCreatePayload {
  description: string;
  amount: string;
  income_date: string;
  account_id?: string;
  category_id?: string;
  status: IncomeStatus;
}

export interface IncomeFilters {
  start_date?: string;
  end_date?: string;
  category_id?: string;
  account_id?: string;
  status?: IncomeStatus;
}

export const incomeStatusLabels: Record<IncomeStatus, string> = {
  expected: "Previsto",
  received: "Recebido",
  late: "Atrasado",
  cancelled: "Cancelado",
};

export async function listIncomes(filters: IncomeFilters = {}): Promise<Income[]> {
  const { data } = await api.get<Income[]>("/incomes", { params: filters });
  return data;
}

export async function createIncome(payload: IncomeCreatePayload): Promise<Income> {
  const { data } = await api.post<Income>("/incomes", payload);
  return data;
}

export async function updateIncome(id: string, payload: Partial<IncomeCreatePayload>): Promise<Income> {
  const { data } = await api.put<Income>(`/incomes/${id}`, payload);
  return data;
}

export async function deleteIncome(id: string): Promise<void> {
  await api.delete(`/incomes/${id}`);
}
