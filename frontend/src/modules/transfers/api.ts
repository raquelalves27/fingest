import { api } from "@/lib/api";

export interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: string;
  transfer_date: string;
  description: string | null;
}

export interface TransferCreatePayload {
  from_account_id: string;
  to_account_id: string;
  amount: string;
  transfer_date: string;
  description?: string;
}

export async function listTransfers(): Promise<Transfer[]> {
  const { data } = await api.get<Transfer[]>("/transfers");
  return data;
}

export async function createTransfer(payload: TransferCreatePayload): Promise<Transfer> {
  const { data } = await api.post<Transfer>("/transfers", payload);
  return data;
}

export async function deleteTransfer(id: string): Promise<void> {
  await api.delete(`/transfers/${id}`);
}
