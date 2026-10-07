export interface MatchedRow {
  db_name: string;
  file_name: string;
}

export interface PremiumsImportResult {
  period_id: number;
  rows_total: number;
  matched: MatchedRow[];
  not_matched: string[];
  created: number;
  updated: number;
}

export async function uploadPremiumsFile(
  periodId: number,
  file: File,
): Promise<PremiumsImportResult> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`/api/periods/${periodId}/import-premiums`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Импорт не удался: ${res.status} ${text}`);
  }
  return (await res.json()) as PremiumsImportResult;
}
