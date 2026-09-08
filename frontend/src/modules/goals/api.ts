import { api } from "@/lib/api";

export type GoalStatus = "active" | "completed" | "cancelled";

export interface Contribution {
  id: string;
  amount: string;
  contribution_date: string;
  account_id: string | null;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: string;
  target_date: string | null;
  status: GoalStatus;
  saved_amount: string;
  progress_percentage: number;
  contributions: Contribution[];
}

export interface GoalCreatePayload {
  name: string;
  target_amount: string;
  target_date?: string;
}

export interface ContributionCreatePayload {
  amount: string;
  contribution_date: string;
  account_id?: string;
}

export async function listGoals(): Promise<Goal[]> {
  const { data } = await api.get<Goal[]>("/goals");
  return data;
}

export async function createGoal(payload: GoalCreatePayload): Promise<Goal> {
  const { data } = await api.post<Goal>("/goals", payload);
  return data;
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(`/goals/${id}`);
}

export async function addContribution(goalId: string, payload: ContributionCreatePayload): Promise<Goal> {
  const { data } = await api.post<Goal>(`/goals/${goalId}/contributions`, payload);
  return data;
}
