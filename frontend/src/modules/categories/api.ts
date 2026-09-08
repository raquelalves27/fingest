import { api } from "@/lib/api";

export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  type: CategoryType;
  icon: string | null;
  color: string | null;
}

export interface CategoryCreatePayload {
  name: string;
  type: CategoryType;
  parent_id?: string;
  color?: string;
  icon?: string;
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories");
  return data;
}

export async function createCategory(payload: CategoryCreatePayload): Promise<Category> {
  const { data } = await api.post<Category>("/categories", payload);
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`);
}

const PALETTE = ["#1B6B4A", "#C4622D", "#3B82F6", "#EAB308", "#EC4899", "#8B5CF6", "#22C55E", "#F97316"];

export function colorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length];
}
