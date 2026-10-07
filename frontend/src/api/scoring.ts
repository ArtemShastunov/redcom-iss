import { apiFetch } from "./client";

export interface OperatorScore {
  operator_id: number;
  operator_name: string;
  calls_handled: number;
  has_critical_errors: boolean;
  critical_errors_reason: string | null;
  evaluations_count: number;

  auto_tone: number;
  auto_completeness: number;
  auto_dialog: number;

  tone_score: number;
  completeness_score: number;
  dialog_score: number;
  summary_score: number;

  override_tone: number | null;
  override_completeness: number | null;
  override_dialog: number | null;
  override_reason: string | null;

  rank: number | null;
  premium: number;
  excluded_reason: string | null;
}

export interface SupervisorScore {
  supervisor_id: number;
  supervisor_name: string;
  norm_score: number | null;
  summary_score: number | null;
  premium: number;
}

export interface PeriodScoring {
  period_id: number;
  operators: OperatorScore[];
  supervisors: SupervisorScore[];
  total_premium: number;
}

export function fetchPeriodScoring(periodId: number): Promise<PeriodScoring> {
  return apiFetch<PeriodScoring>(`/api/scoring/period/${periodId}`);
}
