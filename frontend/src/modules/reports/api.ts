import { api } from "@/lib/api";

export interface MonthlyEvolutionPoint {
  label: string;
  income: string;
  expense: string;
  net: string;
}

export interface CardSpendingItem {
  credit_card_id: string;
  credit_card_name: string;
  total: string;
}

export interface AccountSpendingItem {
  account_id: string;
  account_name: string;
  total: string;
}

export interface Report {
  monthly_evolution: MonthlyEvolutionPoint[];
  spending_by_card: CardSpendingItem[];
  spending_by_account: AccountSpendingItem[];
}

export async function getReport(months = 12): Promise<Report> {
  const { data } = await api.get<Report>("/reports", { params: { months } });
  return data;
}

export async function downloadExpensesCsv(): Promise<void> {
  const response = await api.get("/reports/export/expenses.csv", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = "despesas.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
