import { apiFetch } from "./client";

export interface Evaluation {
  id: number;
  period_id: number;
  call_date: string;
  phone: string;
  contract_number: string | null;
  tone: number;
  completeness: number;
  dialog_1c: number;
  question: string | null;
  what_was: string | null;
  how_should_be: string | null;
  impact: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  operator: { id: number; full_name: string; is_active: boolean };
  supervisor: { id: number; full_name: string; role: string };
}

export interface EvaluationIn {
  period_id: number;
  operator_id: number;
  supervisor_id?: number | null;
  call_date: string;
  phone: string;
  contract_number?: string | null;
  tone: number;
  completeness: number;
  dialog_1c: number;
  question?: string | null;
  what_was?: string | null;
  how_should_be?: string | null;
  impact?: string | null;
  comment?: string | null;
}

export function listEvaluations(
  periodId: number,
  operatorId: number,
): Promise<Evaluation[]> {
  const qs = new URLSearchParams({
    period_id: String(periodId),
    operator_id: String(operatorId),
  });
  return apiFetch<Evaluation[]>(`/api/evaluations?${qs}`);
}

export function createEvaluation(payload: EvaluationIn): Promise<Evaluation> {
  return apiFetch<Evaluation>("/api/evaluations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEvaluation(
  id: number,
  payload: Partial<EvaluationIn>,
): Promise<Evaluation> {
  return apiFetch<Evaluation>(`/api/evaluations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteEvaluation(id: number): Promise<void> {
  return apiFetch<void>(`/api/evaluations/${id}`, { method: "DELETE" });
}
