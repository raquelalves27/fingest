import { api } from "@/lib/api";

export type AccountType = "checking" | "savings" | "wallet" | "investment" | "cash";

export interface Account {
  id: string;
  name: string;
  bank: string | null;
  type: AccountType;
  initial_balance: string;
  current_balance: string;
  color: string | null;
  icon: string | null;
  is_active: boolean;
}

export interface AccountCreatePayload {
  name: string;
  bank?: string;
  type: AccountType;
  initial_balance: string;
  color?: string;
}

export const accountTypeLabels: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  wallet: "Carteira",
  investment: "Investimento",
  cash: "Dinheiro",
};

export async function listAccounts(): Promise<Account[]> {
  const { data } = await api.get<Account[]>("/accounts");
  return data;
}

export async function createAccount(payload: AccountCreatePayload): Promise<Account> {
  const { data } = await api.post<Account>("/accounts", payload);
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`/accounts/${id}`);
}
