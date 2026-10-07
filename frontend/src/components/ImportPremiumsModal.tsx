import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import {
  uploadPremiumsFile,
  type PremiumsImportResult,
} from "../api/importPremiums";

export default function ImportPremiumsModal({
  periodId,
  onClose,
}: {
  periodId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<PremiumsImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => uploadPremiumsFile(periodId, file),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      qc.invalidateQueries({ queryKey: ["op-periods", periodId] });
      qc.invalidateQueries({ queryKey: ["scoring", periodId] });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Не удалось импортировать");
      setResult(null);
    },
  });

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setResult(null);
    setError(null);
    upload.mutate(f);
  }

  return (
    <Modal
      title="Импорт файла премий"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={pickFile}
            disabled={upload.isPending}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {upload.isPending
              ? "Загрузка…"
              : fileName
                ? "Загрузить другой файл"
                : "Выбрать файл"}
          </button>
        </>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="space-y-4">
        <div className="text-sm text-slate-600">
          Формат файла — «премия_&lt;ММ&gt;.xlsx» из Fastcom/1С. Пересохрани
          старый .xls в .xlsx перед загрузкой. Импорт идемпотентен:
          повторная загрузка перезаписывает числа за период.
        </div>

        {fileName && (
          <div className="text-sm">
            <span className="text-slate-500">Файл:</span>{" "}
            <span className="font-medium">{fileName}</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-slate-500">Всего строк:</span>{" "}
              <span className="font-medium">{result.rows_total}</span>
              {" · "}
              <span className="text-slate-500">сопоставлено:</span>{" "}
              <span className="font-medium text-emerald-700">
                {result.matched.length}
              </span>
              {result.not_matched.length > 0 && (
                <>
                  {" · "}
                  <span className="text-slate-500">не найдено:</span>{" "}
                  <span className="font-medium text-amber-700">
                    {result.not_matched.length}
                  </span>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                <div className="text-emerald-800 font-medium">
                  Создано: {result.created}
                </div>
                <div className="text-emerald-700 text-xs">
                  новых записей по операторам
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                <div className="text-blue-800 font-medium">
                  Обновлено: {result.updated}
                </div>
                <div className="text-blue-700 text-xs">
                  уже были за этот период
                </div>
              </div>
            </div>

            {result.matched.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-700">
                  Показать сопоставления
                </summary>
                <div className="mt-2 max-h-60 overflow-y-auto border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-2 py-1">В системе</th>
                        <th className="text-left px-2 py-1">В файле</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.matched.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">{r.db_name}</td>
                          <td className="px-2 py-1 text-slate-500">
                            {r.file_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            {result.not_matched.length > 0 && (
              <details className="text-sm" open>
                <summary className="cursor-pointer text-amber-700">
                  Не найдено в системе ({result.not_matched.length})
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto border rounded">
                  <ul className="text-xs">
                    {result.not_matched.map((n, i) => (
                      <li key={i} className="px-2 py-1 border-t first:border-t-0">
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Обычно это супервайзеры и новички, которых нет в операторах.
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
