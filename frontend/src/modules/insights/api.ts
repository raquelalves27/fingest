import { api } from "@/lib/api";

export interface Insight {
  text: string;
}

export async function getInsights(): Promise<Insight[]> {
  const { data } = await api.get<{ insights: Insight[] }>("/insights");
  return data.insights;
}
