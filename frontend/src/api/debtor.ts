import { apiFetch } from "./client";

export interface DebtorPeriod {
  id: number;
  year: number;
  month: number;
  created_at: string;
}

export interface DebtorRow {
  operator_id: number;
  operator_name: string;
  operator_premium_name: string | null;
  previous_amount: number;
  current_amount: number;
  total: number;
  percent_5: number;
  net_amount: number;
}

export interface DebtorReport {
  period_id: number;
  year: number;
  month: number;
  rows: DebtorRow[];
  total_previous: number;
  total_current: number;
  total_total: number;
  total_percent_5: number;
  total_net: number;
}

export interface DebtorImportResult {
  period_id: number;
  year: number;
  month: number;
  matched: number;
  unmatched: string[];
  previous_only: string[];
  current_only: string[];
}

export function listDebtorPeriods(): Promise<DebtorPeriod[]> {
  return apiFetch<DebtorPeriod[]>("/api/debtor/periods");
}

export function fetchDebtorPeriod(id: number): Promise<DebtorReport> {
  return apiFetch<DebtorReport>(`/api/debtor/periods/${id}`);
}

export function deleteDebtorPeriod(id: number): Promise<void> {
  return apiFetch<void>(`/api/debtor/periods/${id}`, { method: "DELETE" });
}

export async function uploadDebtorFiles(
  previous: File,
  current: File,
  year: number,
  month: number,
): Promise<DebtorImportResult> {
  const base = import.meta.env.VITE_API_URL || "";
  const fd = new FormData();
  fd.append("previous", previous);
  fd.append("current", current);

  const res = await fetch(
    `${base}/api/debtor/import?year=${year}&month=${month}`,
    { method: "POST", credentials: "include", body: fd },
  );

  if (!res.ok) {
    let msg = `Импорт не удался: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) msg = j.detail;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as DebtorImportResult;
}

export async function downloadDebtorPeriod(
  id: number,
  filename: string,
): Promise<void> {
  const base = import.meta.env.VITE_API_URL || "";
  const res = await fetch(`${base}/api/debtor/periods/${id}/export`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Экспорт не удался: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}