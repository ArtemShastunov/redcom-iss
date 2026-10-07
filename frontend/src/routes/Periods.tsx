import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPeriod, listPeriods, type Period } from "../api/periods";
import { periodLabel } from "../lib/format";
import { usePermissions } from "../lib/usePermissions";
import StatusBadge from "../components/StatusBadge";

export default function Periods() {
  const { canManagePeriods } = usePermissions();
  const qc = useQueryClient();

  const periods = useQuery({
    queryKey: ["periods"],
    queryFn: listPeriods,
  });

  const [creating, setCreating] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createPeriod(year, month),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periods"] });
      setCreating(false);
      setError(null);
    },
    onError: (e: unknown) => {
      setError(
        e instanceof Error && "status" in e && (e as { status: number }).status === 409
          ? "Период уже существует"
          : "Не удалось создать период",
      );
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Периоды</h1>
        {canManagePeriods && (
          <button
            onClick={() => setCreating((v) => !v)}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            {creating ? "Отмена" : "Новый период"}
          </button>
        )}
      </div>

      {creating && (
        <div className="bg-white border rounded p-4 flex items-end gap-3">
          <label className="text-sm">
            <span className="text-slate-600 block mb-1">Год</span>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border rounded px-2 py-1 w-24"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600 block mb-1">Месяц</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Создать
          </button>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      )}

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Период</th>
              <th className="text-left px-4 py-2 font-medium">Статус</th>
              <th className="text-left px-4 py-2 font-medium">Закрыт</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody>
            {periods.isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Загрузка…
                </td>
              </tr>
            )}
            {periods.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Периодов пока нет
                </td>
              </tr>
            )}
            {periods.data?.map((p: Period) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">
                  <Link
                    to={`/periods/${p.id}`}
                    className="text-slate-900 hover:underline"
                  >
                    {periodLabel(p.year, p.month)}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {p.closed_at
                    ? new Date(p.closed_at).toLocaleDateString("ru-RU")
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    to={`/periods/${p.id}`}
                    className="text-slate-600 hover:text-slate-900 text-sm"
                  >
                    Открыть →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
