import { api } from "@/lib/api";

export type RecurrenceFrequency = "monthly" | "weekly" | "yearly" | "custom";

export interface RecurringTransaction {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: string;
  category_id: string | null;
  account_id: string | null;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date: string | null;
  next_occurrence_date: string | null;
  is_active: boolean;
}

export interface RecurringCreatePayload {
  type: "income" | "expense";
  description: string;
  amount: string;
  category_id?: string;
  account_id?: string;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date?: string;
}

export const frequencyLabels: Record<RecurrenceFrequency, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  yearly: "Anual",
  custom: "Personalizada",
};

export async function listRecurring(): Promise<RecurringTransaction[]> {
  const { data } = await api.get<RecurringTransaction[]>("/recurring-transactions");
  return data;
}

export async function createRecurring(payload: RecurringCreatePayload): Promise<RecurringTransaction> {
  const { data } = await api.post<RecurringTransaction>("/recurring-transactions", payload);
  return data;
}

export async function deleteRecurring(id: string): Promise<void> {
  await api.delete(`/recurring-transactions/${id}`);
}
