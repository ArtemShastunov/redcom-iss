import { apiFetch } from "./client";

export interface SupervisorPeriod {
  period_id: number;
  norm_score: number | null;
  supervisor: { id: number; full_name: string; role: string };
}

export interface SupervisorPeriodIn {
  norm_score: number | null;
}

export function listSupervisorPeriods(periodId: number): Promise<SupervisorPeriod[]> {
  return apiFetch<SupervisorPeriod[]>(
    `/api/supervisor-periods?period_id=${periodId}`,
  );
}

export function upsertSupervisorPeriod(
  periodId: number,
  supervisorId: number,
  payload: SupervisorPeriodIn,
): Promise<SupervisorPeriod> {
  return apiFetch<SupervisorPeriod>(
    `/api/supervisor-periods/${periodId}/${supervisorId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}
