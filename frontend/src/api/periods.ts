import { apiFetch } from "./client";

export interface Period {
  id: number;
  year: number;
  month: number;
  status: "open" | "closed";
  closed_at: string | null;
}

export function listPeriods(): Promise<Period[]> {
  return apiFetch<Period[]>("/api/periods");
}

export function createPeriod(year: number, month: number): Promise<Period> {
  return apiFetch<Period>("/api/periods", {
    method: "POST",
    body: JSON.stringify({ year, month }),
  });
}

export function closePeriod(id: number): Promise<Period> {
  return apiFetch<Period>(`/api/periods/${id}/close`, { method: "POST" });
}

export function reopenPeriod(id: number): Promise<Period> {
  return apiFetch<Period>(`/api/periods/${id}/reopen`, { method: "POST" });
}
