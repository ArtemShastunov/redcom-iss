import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDebtorPeriod,
  downloadDebtorPeriod,
  fetchDebtorPeriod,
  listDebtorPeriods,
  uploadDebtorFiles,
  type DebtorImportResult,
} from "../api/debtor";
import { usePermissions } from "../lib/usePermissions";
import { monthName } from "../lib/format";
import Modal from "../components/Modal";

function fmtMoney(v: number): string {
  return v.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Debtors() {
  const { canManagePeriods } = usePermissions();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const periods = useQuery({
    queryKey: ["debtor-periods"],
    queryFn: listDebtorPeriods,
  });

  const activeId = selectedId ?? periods.data?.[0]?.id ?? null;

  const report = useQuery({
    queryKey: ["debtor-period", activeId],
    queryFn: () => fetchDebtorPeriod(activeId!),
    enabled: activeId !== null,
  });

  const activePeriod = periods.data?.find((p) => p.id === activeId);

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteDebtorPeriod(id),
    onSuccess: () => {
      setSelectedId(null);
      setDeleteError(null);
      qc.invalidateQueries({ queryKey: ["debtor-periods"] });
    },
    onError: (e: unknown) => {
      const status = (e as { status?: number }).status;
      const detail = (e as { detail?: string }).detail;
      setDeleteError(
        status === 403
          ? "Только начальник ИСС и админ могут удалять периоды"
          : String(detail ?? "Не удалось удалить период"),
      );
    },
  });

  async function handleExport() {
    if (!activePeriod) return;
    setExporting(true);
    try {
      await downloadDebtorPeriod(
        activePeriod.id,
        `Премия_дебиторка_${monthName(activePeriod.month)}_${activePeriod.year}.xlsx`,
      );
    } finally {
      setExporting(false);
    }
  }

  function handleDelete() {
    if (!activePeriod) return;
    const label = `${monthName(activePeriod.month)} ${activePeriod.year}`;
    if (
      !confirm(
        `Удалить период дебиторки «${label}»?\n\n` +
          `Все данные за этот период будут удалены без возможности восстановления.`,
      )
    ) {
      return;
    }
    deleteMut.mutate(activePeriod.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Дебиторка</h1>
        <div className="flex gap-2 flex-wrap">
          {canManagePeriods && (
            <button
              onClick={() => setImportOpen(true)}
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Загрузить файлы
            </button>
          )}
          {activePeriod && canManagePeriods && (
            <button
              onClick={handleExport}
              disabled={exporting || !report.data}
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting ? "Экспорт…" : "Экспорт в Excel"}
            </button>
          )}
          {activePeriod && canManagePeriods && (
            <button
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="rounded border border-red-300 text-red-700 px-3 py-1.5 text-sm hover:bg-red-50 disabled:opacity-50"
            >
              {deleteMut.isPending ? "Удаление…" : "Удалить период"}
            </button>
          )}
        </div>
      </div>

      {deleteError && (
        <div className="bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-800 flex justify-between items-start gap-4">
          <span>{deleteError}</span>
          <button
            onClick={() => setDeleteError(null)}
            className="text-red-600 hover:text-red-900 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {periods.data && periods.data.length > 0 && (
        <div className="flex gap-2 text-sm flex-wrap">
          {periods.data.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={
                "px-3 py-1 rounded border " +
                (p.id === activeId
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50")
              }
            >
              {monthName(p.month)} {p.year}
            </button>
          ))}
        </div>
      )}

      {periods.isLoading && <div className="text-slate-500">Загрузка…</div>}

      {periods.data && periods.data.length === 0 && (
        <div className="text-slate-500">
          Пока нет ни одного периода дебиторки.{" "}
          {canManagePeriods && "Загрузите файлы, чтобы начать."}
        </div>
      )}

      {report.data && (
        <div className="bg-white border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Оператор</th>
                <th className="text-right px-3 py-2 font-medium">Остатки</th>
                <th className="text-right px-3 py-2 font-medium">
                  {monthName(report.data.month)}
                </th>
                <th className="text-right px-3 py-2 font-medium">Итого</th>
                <th className="text-right px-3 py-2 font-medium">5%</th>
                <th className="text-right px-3 py-2 font-medium">На руки</th>
              </tr>
            </thead>
            <tbody>
              {report.data.rows.map((r) => (
                <tr key={r.operator_id} className="border-t">
                  <td className="px-3 py-2">
                    {r.operator_premium_name ?? r.operator_name}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {fmtMoney(r.previous_amount)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {fmtMoney(r.current_amount)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {fmtMoney(r.total)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {fmtMoney(r.percent_5)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-emerald-700">
                    {fmtMoney(r.net_amount)}
                  </td>
                </tr>
              ))}
              {report.data.rows.length > 0 && (
                <tr className="border-t bg-slate-50 font-medium">
                  <td className="px-3 py-2">ИТОГО</td>
                  <td className="px-3 py-2 text-right">
                    {fmtMoney(report.data.total_previous)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {fmtMoney(report.data.total_current)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {fmtMoney(report.data.total_total)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {fmtMoney(report.data.total_percent_5)}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-700">
                    {fmtMoney(report.data.total_net)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {importOpen && (
        <DebtorImportModal
          onClose={() => {
            setImportOpen(false);
            qc.invalidateQueries({ queryKey: ["debtor-periods"] });
          }}
        />
      )}
    </div>
  );
}

function DebtorImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const prevRef = useRef<HTMLInputElement>(null);
  const currRef = useRef<HTMLInputElement>(null);

  const [prevFile, setPrevFile] = useState<File | null>(null);
  const [currFile, setCurrFile] = useState<File | null>(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DebtorImportResult | null>(null);

  const mutate = useMutation({
    mutationFn: () => uploadDebtorFiles(prevFile!, currFile!, year, month),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      qc.invalidateQueries({ queryKey: ["debtor-periods"] });
      qc.invalidateQueries({ queryKey: ["debtor-period"] });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Не удалось импортировать");
    },
  });

  return (
    <Modal
      title="Импорт дебиторки"
      onClose={onClose}
      footer={
        result ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            Готово
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => mutate.mutate()}
              disabled={!prevFile || !currFile || mutate.isPending}
              className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {mutate.isPending ? "Загрузка…" : "Импортировать"}
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3 text-sm">
          <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
            Импорт завершён. Совпало с операторами: <b>{result.matched}</b>
          </div>
          <div className="text-xs text-slate-500">
            Если период уже существовал — данные перезаписаны.
          </div>
          {result.unmatched.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <div className="font-medium mb-1">
                Не найдено в системе ({result.unmatched.length}):
              </div>
              <ul className="list-disc pl-5 text-xs">
                {result.unmatched.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Если период с указанными годом и месяцем уже существует —
            его данные будут <b>полностью перезаписаны</b>.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-600">Год</span>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Месяц</span>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {monthName(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className="text-sm text-slate-600 mb-1">
              Прошлый месяц (остатки)
            </div>
            <input
              ref={prevRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => setPrevFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => prevRef.current?.click()}
              className="w-full rounded border border-dashed border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 text-left"
            >
              {prevFile ? prevFile.name : "Выбрать файл .xlsx"}
            </button>
          </div>

          <div>
            <div className="text-sm text-slate-600 mb-1">Текущий месяц</div>
            <input
              ref={currRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => setCurrFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => currRef.current?.click()}
              className="w-full rounded border border-dashed border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 text-left"
            >
              {currFile ? currFile.name : "Выбрать файл .xlsx"}
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Файлы <b>.xls</b> нужно пересохранить в <b>.xlsx</b> перед загрузкой.
            Формат: две колонки — <b>ФИО</b> и <b>Сумма</b>, шапка в первой строке.
          </div>
        </div>
      )}
    </Modal>
  );
}