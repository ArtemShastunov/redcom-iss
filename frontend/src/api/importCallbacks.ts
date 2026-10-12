export interface CallbackRow {
  db_name: string;
  file_name: string;
  count: number;
}

export interface CallbacksNotMatched {
  file_name: string;
  count: number;
}

export interface CallbacksImportResult {
  period_id: number;
  rows_total: number;
  matched: CallbackRow[];
  not_matched: CallbacksNotMatched[];
  created: number;
  updated: number;
}

export async function uploadCallbacksFile(
  periodId: number,
  file: File,
): Promise<CallbacksImportResult> {
  const base = import.meta.env.VITE_API_URL || "";
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${base}/api/periods/${periodId}/import-callbacks`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Импорт не удался: ${res.status} ${text}`);
  }
  return (await res.json()) as CallbacksImportResult;
}