import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Evaluation } from "../api/evaluations";
import { downloadMyEvaluations } from "../api/export";
import { periodLabel } from "../lib/format";
import EvaluationDetailsModal from "./EvaluationDetailsModal";
import ScoreCell from "./ScoreCell";
import StatusBadge from "./StatusBadge";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU");
}

export default function OperatorPeriodView({
  periodId,
  period,
}: {
  periodId: number;
  period: { year: number; month: number; status: "open" | "closed" };
}) {
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Evaluation | null>(null);

  const evals = useQuery({
    queryKey: ["evaluations", periodId, "all"],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/evaluations?period_id=${periodId}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Не удалось загрузить оценки");
      return (await res.json()) as Evaluation[];
    },
  });

  const byOperator = useMemo(() => {
    if (!evals.data) return [];
    const map = new Map<number, { name: string; items: Evaluation[] }>();
    for (const e of evals.data) {
      const entry = map.get(e.operator.id) ?? {
        name: e.operator.full_name,
        items: [],
      };
      entry.items.push(e);
      map.set(e.operator.id, entry);
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      operatorId: id,
      operatorName: v.name,
      items: v.items.sort((a, b) => a.call_date.localeCompare(b.call_date)),
    }));
  }, [evals.data]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadMyEvaluations(
        periodId,
        `Мои оценки_${periodLabel(period.year, period.month)}.xlsx`,
      );
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : "Не удалось выгрузить. Обратитесь к администратору.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/periods"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Все периоды
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {periodLabel(period.year, period.month)}
          </h1>
          <StatusBadge status={period.status} />
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {exporting ? "Экспорт…" : "Скачать мои оценки в Excel"}
        </button>
      </div>

      <div className="text-xs text-slate-500">
        Клик по строке — откроется полная карточка оценки.
      </div>

      {evals.isLoading && <div className="text-slate-500">Загрузка…</div>}

      {byOperator.length === 0 && !evals.isLoading && (
        <div className="text-slate-500">За этот период оценок пока нет.</div>
      )}

      {byOperator.map((group) => (
        <div key={group.operatorId} className="space-y-2">
          <h2 className="font-medium text-slate-700">
            {group.operatorName}{" "}
            <span className="text-slate-400 text-sm">
              ({group.items.length})
            </span>
          </h2>
          <div className="bg-white border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-28">Дата</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Телефон</th>
                  <th className="text-left px-3 py-2 font-medium w-24">Договор</th>
                  <th className="text-center px-3 py-2 font-medium w-16">Тон</th>
                  <th className="text-center px-3 py-2 font-medium w-20">
                    Полнота
                  </th>
                  <th className="text-center px-3 py-2 font-medium w-16">1С</th>
                  <th className="text-left px-3 py-2 font-medium">Вопрос</th>
                  <th className="text-left px-3 py-2 font-medium w-40">
                    Супервайзер
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => setSelected(ev)}
                    className="border-t align-top cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                      {fmtDate(ev.call_date)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{ev.phone}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {ev.contract_number ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ScoreCell value={ev.tone} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ScoreCell value={ev.completeness} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ScoreCell value={ev.dialog_1c} />
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {ev.question ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-xs">
                      {ev.supervisor.full_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {selected && (
        <EvaluationDetailsModal
          evaluation={selected}
          onClose={() => setSelected(null)}
          showOperator={false}
        />
      )}
    </div>
  );
}