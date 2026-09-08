import { api } from "@/lib/api";

export interface Installment {
  id: string;
  installment_number: number;
  total_installments: number;
  amount: string;
  status: "pending" | "paid" | "cancelled";
  invoice_id: string;
}

export interface Purchase {
  id: string;
  credit_card_id: string;
  category_id: string | null;
  description: string;
  total_amount: string;
  purchase_date: string;
  installments_count: number;
  status: "active" | "cancelled";
  installments: Installment[];
  is_recurring: boolean;
  recurring_active: boolean;
  recurring_day: number | null;
  recurring_next_date: string | null;
}

export interface PurchaseCreatePayload {
  credit_card_id: string;
  category_id?: string;
  description: string;
  total_amount: string;
  purchase_date: string;
  installments_count: number;
  is_recurring?: boolean;
  recurring_day?: number;
}

export interface PurchaseUpdatePayload {
  category_id?: string | null;
  description?: string;
  total_amount?: string;
  purchase_date?: string;
  installments_count?: number;
  recurring_active?: boolean;
  recurring_day?: number;
}

export async function listPurchases(creditCardId?: string): Promise<Purchase[]> {
  const { data } = await api.get<Purchase[]>("/credit-card-purchases", {
    params: creditCardId ? { credit_card_id: creditCardId } : undefined,
  });
  return data;
}

export async function createPurchase(payload: PurchaseCreatePayload): Promise<Purchase> {
  const { data } = await api.post<Purchase>("/credit-card-purchases", payload);
  return data;
}

export async function updatePurchase(id: string, payload: PurchaseUpdatePayload): Promise<Purchase> {
  const { data } = await api.put<Purchase>(`/credit-card-purchases/${id}`, payload);
  return data;
}

export async function cancelPurchase(id: string): Promise<void> {
  await api.delete(`/credit-card-purchases/${id}`);
}
