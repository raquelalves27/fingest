import { api } from "@/lib/api";

export interface CreditCard {
  id: string;
  name: string;
  bank: string | null;
  brand: string | null;
  credit_limit: string;
  available_limit: string;
  closing_day: number;
  due_day: number;
  color: string | null;
  last_four_digits: string | null;
  is_active: boolean;
}

export interface CreditCardCreatePayload {
  name: string;
  bank?: string;
  brand?: string;
  credit_limit: string;
  closing_day: number;
  due_day: number;
  color?: string;
  last_four_digits?: string;
}

export async function listCreditCards(): Promise<CreditCard[]> {
  const { data } = await api.get<CreditCard[]>("/credit-cards");
  return data;
}

export async function createCreditCard(payload: CreditCardCreatePayload): Promise<CreditCard> {
  const { data } = await api.post<CreditCard>("/credit-cards", payload);
  return data;
}

export async function deleteCreditCard(id: string): Promise<void> {
  await api.delete(`/credit-cards/${id}`);
}
