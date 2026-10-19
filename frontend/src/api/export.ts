export async function downloadPeriodXlsx(
  periodId: number,
  filename: string,
): Promise<void> {
  const base = import.meta.env.VITE_API_URL || "";
  const res = await fetch(`${base}/api/periods/${periodId}/export`, {
    credentials: "include",
  });
  if (!res.ok) {
    let msg = `Экспорт не удался: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) msg = j.detail;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  triggerDownload(blob, filename);
}

export async function downloadMyEvaluations(
  periodId: number,
  filename: string,
): Promise<void> {
  const base = import.meta.env.VITE_API_URL || "";
  const res = await fetch(`${base}/api/periods/${periodId}/my-export`, {
    credentials: "include",
  });
  if (!res.ok) {
    let msg = `Экспорт не удался: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) msg = j.detail;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}