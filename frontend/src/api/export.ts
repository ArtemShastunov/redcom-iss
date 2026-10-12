export async function downloadPeriodXlsx(
  periodId: number,
  filename: string,
): Promise<void> {
  const base = import.meta.env.VITE_API_URL || "";
  const res = await fetch(`${base}/api/periods/${periodId}/export`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`);
  }
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