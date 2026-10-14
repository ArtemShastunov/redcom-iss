import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvaluation,
  deleteEvaluation,
  listEvaluations,
  updateEvaluation,
  type Evaluation,
  type EvaluationIn,
} from "../api/evaluations";
import { fetchOperator } from "../api/operators";
import { listPeriods, type Period } from "../api/periods";
import { fetchPeriodScoring } from "../api/scoring";
import { useMe } from "../lib/useMe";
import { periodLabel } from "../lib/format";
import EvaluationDetailsModal from "../components/EvaluationDetailsModal";
import ScoreCell from "../components/ScoreCell";
import StatusBadge from "../components/StatusBadge";
import EvaluationForm from "../components/EvaluationForm";

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OperatorDetail() {
  const { id, opId } = useParams<{ id: string; opId: string }>();
  const periodId = Number(id);
  const operatorId = Number(opId);
  const me = useMe();
  const qc = useQueryClient();

  const periods = useQuery({ queryKey: ["periods"], queryFn: listPeriods });
  const period = periods.data?.find((p: Period) => p.id === periodId);

  const operator = useQuery({
    queryKey: ["operator", operatorId],
    queryFn: () => fetchOperator(operatorId),
  });

  const scoring = useQuery({
    queryKey: ["scoring", periodId],
    queryFn: () => fetchPeriodScoring(periodId),
    enabled: Number.isFinite(periodId),
  });

  const evals = useQuery({
    queryKey: ["evaluations", periodId, operatorId],
    queryFn: () => listEvaluations(periodId, operatorId),
    enabled: Number.isFinite(periodId) && Number.isFinite(operatorId),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluation | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Evaluation | null>(null);

  const isClosed = period?.status === "closed";
  const role = me.data?.role;
  const canCreate =
    (role === "supervisor" || role === "head" || role === "admin") && !isClosed;

  function canEdit(ev: Evaluation): boolean {
    if (isClosed) return false;
    if (role === "head" || role === "admin") return true;
    if (role === "supervisor" && ev.supervisor.id === me.data?.id) return true;
    return false;
  }

  const createMut = useMutation({
    mutationFn: (payload: EvaluationIn) => createEvaluation(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluations", periodId, operatorId] });
      qc.invalidateQueries({ queryKey: ["scoring", periodId] });
      setFormOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: (e: unknown) => {
      const status = (e as { status?: number }).status;
      setFormError(status === 409 ? "Период закрыт" : "Не удалось сохранить");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id: evalId, payload }: { id: number; payload: EvaluationIn }) =>
      updateEvaluation(evalId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluations", periodId, operatorId] });
      qc.invalidateQueries({ queryKey: ["scoring", periodId] });
      setFormOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: () => setFormError("Не удалось сохранить"),
  });

  const deleteMut = useMutation({
    mutationFn: (evalId: number) => deleteEvaluation(evalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluations", periodId, operatorId] });
      qc.invalidateQueries({ queryKey: ["scoring", periodId] });
    },
  });

  const grouped = useMemo(() => {
    if (!evals.data)
      return [] as { supervisor: Evaluation["supervisor"]; items: Evaluation[] }[];
    const bySup = new Map<number, Evaluation[]>();
    for (const ev of evals.data) {
      const arr = bySup.get(ev.supervisor.id) ?? [];
      arr.push(ev);
      bySup.set(ev.supervisor.id, arr);
    }
    return Array.from(bySup.entries())
      .sort(([a], [b]) => a - b)
      .map(([, items]) => ({
        supervisor: items[0].supervisor,
        items: items.sort((x, y) => x.call_date.localeCompare(y.call_date)),
      }));
  }, [evals.data]);

  const operatorScore = scoring.data?.operators.find(
    (o) => o.operator_id === operatorId,
  );

  if (!period) return <div className="text-slate-500">Загрузка…</div>;
  if (!operator.data)
    return <div className="text-slate-500">Загрузка оператора…</div>;

  return (
    <div className="space-y-4">
      <div>
        <Link
          to={`/periods/${periodId}`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← {periodLabel(period.year, period.month)}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{operator.data.full_name}</h1>
          <StatusBadge status={period.status} />
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setEditing(null);
              setFormError(null);
              setFormOpen(true);
            }}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            Добавить оценку
          </button>
        )}
      </div>

      {operatorScore && (
        <div className="bg-white border rounded p-3 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-slate-500">Оценок:</span>{" "}
            <span className="font-medium">{operatorScore.evaluations_count}</span>
          </div>
          <div>
            <span className="text-slate-500">Тон:</span>{" "}
            <ScoreCell value={operatorScore.tone_score} auto={operatorScore.auto_tone} />
          </div>
          <div>
            <span className="text-slate-500">Полнота:</span>{" "}
            <ScoreCell
              value={operatorScore.completeness_score}
              auto={operatorScore.auto_completeness}
            />
          </div>
          <div>
            <span className="text-slate-500">1С:</span>{" "}
            <ScoreCell value={operatorScore.dialog_score} auto={operatorScore.auto_dialog} />
          </div>
          <div>
            <span className="text-slate-500">Сводная:</span>{" "}
            <ScoreCell value={operatorScore.summary_score} />
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500">
        Клик по строке — откроется полная карточка оценки.
      </div>

      {evals.isLoading && <div className="text-slate-500">Загрузка оценок…</div>}

      {grouped.map(({ supervisor, items }) => (
        <div key={supervisor.id} className="space-y-2">
          <h2 className="font-medium text-slate-700">
            {supervisor.full_name}{" "}
            <span className="text-slate-400 text-sm">({items.length})</span>
          </h2>
          <div className="bg-white border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-32">Дата</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Телефон</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Договор</th>
                  <th className="text-center px-3 py-2 font-medium w-16">Тон</th>
                  <th className="text-center px-3 py-2 font-medium w-20">
                    Полнота
                  </th>
                  <th className="text-center px-3 py-2 font-medium w-16">1С</th>
                  <th className="text-left px-3 py-2 font-medium">Вопрос</th>
                  <th className="w-28"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => setSelected(ev)}
                    className="border-t align-top cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                      {fmtDateTime(ev.call_date)}
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
                      {ev.comment && (
                        <div className="text-xs text-slate-500 mt-1">
                          {ev.comment}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {canEdit(ev) && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(ev);
                              setFormError(null);
                              setFormOpen(true);
                            }}
                            className="text-slate-600 hover:text-slate-900 text-xs"
                          >
                            Правка
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Удалить оценку?")) {
                                deleteMut.mutate(ev.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-xs ml-2"
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-4 text-center text-slate-400"
                    >
                      Нет оценок
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {formOpen && (
        <EvaluationForm
          periodId={periodId}
          operatorId={operatorId}
          initial={editing ?? undefined}
          supervisorOptions={
            scoring.data?.supervisors.map((s) => ({
              id: s.supervisor_id,
              full_name: s.supervisor_name,
            })) ?? []
          }
          defaultSupervisorId={
            me.data?.role === "supervisor" ? me.data.id : null
          }
          canChooseSupervisor={role === "head" || role === "admin"}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
            setFormError(null);
          }}
          onSubmit={(payload) => {
            if (editing) {
              updateMut.mutate({ id: editing.id, payload });
            } else {
              createMut.mutate(payload);
            }
          }}
          submitting={createMut.isPending || updateMut.isPending}
          error={formError}
        />
      )}

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