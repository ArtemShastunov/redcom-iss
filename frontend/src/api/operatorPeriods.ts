import { apiFetch } from "./client";

export interface OperatorPeriod {
  period_id: number;
  calls_incoming: number;
  calls_outgoing: number;
  chats_bitrix: number;
  chats_mobile: number;
  calls_handled: number; // computed на бэке
  has_critical_errors: boolean;
  critical_errors_reason: string | null;
  override_tone: number | null;
  override_completeness: number | null;
  override_dialog: number | null;
  override_reason: string | null;
  operator: {
    id: number;
    full_name: string;
    premium_name: string | null;
    is_active: boolean;
  };
}

export interface OperatorPeriodIn {
  calls_incoming: number;
  calls_outgoing: number;
  chats_bitrix: number;
  chats_mobile: number;
  has_critical_errors: boolean;
  critical_errors_reason: string | null;
  override_tone: number | null;
  override_completeness: number | null;
  override_dialog: number | null;
  override_reason: string | null;
}

export function listOperatorPeriods(periodId: number): Promise<OperatorPeriod[]> {
  return apiFetch<OperatorPeriod[]>(`/api/operator-periods?period_id=${periodId}`);
}

export function upsertOperatorPeriod(
  periodId: number,
  operatorId: number,
  payload: OperatorPeriodIn,
): Promise<OperatorPeriod> {
  return apiFetch<OperatorPeriod>(
    `/api/operator-periods/${periodId}/${operatorId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}
