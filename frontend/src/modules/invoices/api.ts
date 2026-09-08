import { api } from "@/lib/api";

export type InvoiceStatus = "open" | "closed" | "paid";

export interface Invoice {
  id: string;
  credit_card_id: string;
  reference_month: number;
  reference_year: number;
  closing_date: string;
  due_date: string;
  status: InvoiceStatus;
  total_amount: string;
  paid_at: string | null;
  paid_from_account_id: string | null;
}

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  open: "Aberta",
  closed: "Fechada",
  paid: "Paga",
};

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function invoiceLabel(invoice: Invoice): string {
  return `${MONTH_NAMES[invoice.reference_month - 1]}/${invoice.reference_year}`;
}

export async function listInvoices(creditCardId?: string): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>("/invoices", {
    params: creditCardId ? { credit_card_id: creditCardId } : undefined,
  });
  return data;
}

export async function payInvoice(id: string, accountId: string): Promise<Invoice> {
  const { data } = await api.post<Invoice>(`/invoices/${id}/pay`, { account_id: accountId });
  return data;
}
