import { api } from "@/lib/api";

export interface SearchResult {
  type: "income" | "expense" | "purchase" | "account" | "credit_card";
  id: string;
  title: string;
  subtitle: string;
}

export async function search(query: string): Promise<SearchResult[]> {
  if (query.trim().length < 2) return [];
  const { data } = await api.get<{ results: SearchResult[] }>("/search", { params: { q: query } });
  return data.results;
}
