import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchPeriodScoring, type OperatorScore } from "../api/scoring";
import { periodLabel, formatOperatorName } from "../lib/format";
import ScoreCell from "./ScoreCell";
import StatusBadge from "./StatusBadge";
import CallsCell from "./CallsCell";

export default function OperatorPeriodView({
  periodId,
  period,
}: {
  periodId: number;
  period: { year: number; month: number; status: "open" | "closed" };
}) {
  const scoring = useQuery({
    queryKey: ["scoring", periodId],
    queryFn: () => fetchPeriodScoring(periodId),
  });

  if (scoring.isLoading) return <div className="text-slate-500">Загрузка…</div>;
  if (!scoring.data) return <div className="text-slate-500">Ошибка загрузки</div>;

  return (
    <div className="space-y-4">
      <div>
        <Link to="/periods" className="text-sm text-slate-500 hover:text-slate-900">
          ← Все периоды
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {periodLabel(period.year, period.month)}
        </h1>
        <StatusBadge status={period.status} />
      </div>

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Место</th>
              <th className="text-left px-3 py-2 font-medium">Оператор</th>
              <th className="text-right px-3 py-2 font-medium">Звонков</th>
              <th className="text-right px-3 py-2 font-medium">Оценок</th>
              <th className="text-center px-3 py-2 font-medium">Тон</th>
              <th className="text-center px-3 py-2 font-medium">Полнота</th>
              <th className="text-center px-3 py-2 font-medium">1С</th>
              <th className="text-center px-3 py-2 font-medium">Сводная</th>
              <th className="text-right px-3 py-2 font-medium">Премия</th>
            </tr>
          </thead>
          <tbody>
            {scoring.data.operators.map((op: OperatorScore) => (
              <tr key={op.operator_id} className="border-t">
                <td className="px-3 py-2 text-slate-500">{op.rank ?? "—"}</td>
                <td className="px-3 py-2">
                  <Link
                    to={`/periods/${periodId}/operators/${op.operator_id}`}
                    className="text-slate-900 hover:underline font-medium"
                  >
                    {formatOperatorName(op.operator_name)}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right text-slate-600">
                  <CallsCell value={op.calls_handled} per={null} />
                </td>
                <td className="px-3 py-2 text-right text-slate-600">
                  {op.evaluations_count}
                </td>
                <td className="px-3 py-2 text-center">
                  <ScoreCell value={op.tone_score} auto={op.auto_tone} />
                </td>
                <td className="px-3 py-2 text-center">
                  <ScoreCell value={op.completeness_score} auto={op.auto_completeness} />
                </td>
                <td className="px-3 py-2 text-center">
                  <ScoreCell value={op.dialog_score} auto={op.auto_dialog} />
                </td>
                <td className="px-3 py-2 text-center font-medium">
                  <ScoreCell value={op.summary_score} />
                </td>
                <td className="px-3 py-2 text-right">
                  {op.premium > 0 ? (
                    <span className="font-medium">{op.premium} ₽</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}