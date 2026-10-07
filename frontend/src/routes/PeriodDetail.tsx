import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closePeriod,
  listPeriods,
  reopenPeriod,
  type Period,
} from "../api/periods";
import { fetchPeriodScoring, type OperatorScore } from "../api/scoring";
import {
  listOperatorPeriods,
  upsertOperatorPeriod,
  type OperatorPeriod,
  type OperatorPeriodIn,
} from "../api/operatorPeriods";
import {
  upsertSupervisorPeriod,
  type SupervisorPeriodIn,
} from "../api/supervisorPeriods";
import { downloadPeriodXlsx } from "../api/export";
import { periodLabel } from "../lib/format";
import { usePermissions } from "../lib/usePermissions";
import ScoreCell from "../components/ScoreCell";
import StatusBadge from "../components/StatusBadge";
import CallsCell from "../components/CallsCell";
import ImportPremiumsModal from "../components/ImportPremiumsModal";
import OperatorPeriodForm from "../components/OperatorPeriodForm";
import SupervisorPeriodForm from "../components/SupervisorPeriodForm";

export default function PeriodDetail() {
  const { id } = useParams<{ id: string }>();
  const periodId = Number(id);
  const { canManagePeriods } = usePermissions();
  const qc = useQueryClient();

  const periods = useQuery({ queryKey: ["periods"], queryFn: listPeriods });
  const period = periods.data?.find((p: Period) => p.id === periodId);

  const scoring = useQuery({
    queryKey: ["scoring", periodId],
    queryFn: () => fetchPeriodScoring(periodId),
    enabled: Number.isFinite(periodId),
  });

  const opPeriods = useQuery({
    queryKey: ["op-periods", periodId],
    queryFn: () => listOperatorPeriods(periodId),
    enabled: Number.isFinite(periodId),
  });

  const close = useMutation({
    mutationFn: () => closePeriod(periodId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["periods"] }),
  });

  const reopen = useMutation({
    mutationFn: () => reopenPeriod(periodId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["periods"] }),
  });

  const upsertOp = useMutation({
    mutationFn: ({
      operatorId,
      payload,
    }: {
      operatorId: number;
      payload: OperatorPeriodIn;
    }) => upsertOperatorPeriod(periodId, operatorId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-periods", periodId] });
      qc.invalidateQueries({ queryKey: ["scoring", periodId] });
      setOpForm(null);
      setOpError(null);
    },
    onError: (e: unknown) => {
      const status = (e as { status?: number }).status;
      setOpError(status === 409 ? "Период закрыт" : "Не удалось сохранить");
    },
  });

  const upsertSup = useMutation({
    mutationFn: ({
      supervisorId,
      payload,
    }: {
      supervisorId: number;
      payload: SupervisorPeriodIn;
    }) => upsertSupervisorPeriod(periodId, supervisorId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scoring", periodId] });
      setSupForm(null);
      setSupError(null);
    },
    onError: (e: unknown) => {
      const status = (e as { status?: number }).status;
      setSupError(status === 409 ? "Период закрыт" : "Не удалось сохранить");
    },
  });

  const [opForm, setOpForm] = useState<OperatorScore | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [supForm, setSupForm] = useState<{
    id: number;
    name: string;
    norm: number | null;
  } | null>(null);
  const [supError, setSupError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  if (!period && periods.isLoading) {
    return <div className="text-slate-500">Загрузка…</div>;
  }
  if (!period) {
    return <div className="text-slate-500">Период не найден</div>;
  }

  const isClosed = period.status === "closed";

  function opPeriodFor(opId: number): OperatorPeriod | null {
    return opPeriods.data?.find((x) => x.operator.id === opId) ?? null;
  }

  async function handleExport() {
    if (!period) return;
    setExporting(true);
    try {
      await downloadPeriodXlsx(
        periodId,
        `Совместные итоги_${periodLabel(period.year, period.month)}.xlsx`,
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
        <div className="flex gap-2 flex-wrap">
          {canManagePeriods && (
            <button
              onClick={() => setImportOpen(true)}
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Загрузить премии
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? "Экспорт…" : "Экспорт в Excel"}
          </button>
          {canManagePeriods && (
            <>
              {isClosed ? (
                <button
                  onClick={() => reopen.mutate()}
                  disabled={reopen.isPending}
                  className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Открыть
                </button>
              ) : (
                <button
                  onClick={() => close.mutate()}
                  disabled={close.isPending}
                  className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800"
                >
                  Закрыть период
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {scoring.isLoading && <div className="text-slate-500">Загрузка расчёта…</div>}

      {scoring.data && (
        <>
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
                  <th className="text-left px-3 py-2 font-medium">Примечание</th>
                  {canManagePeriods && <th className="w-24"></th>}
                </tr>
              </thead>
              <tbody>
                {scoring.data.operators.map((op: OperatorScore) => (
                  <tr key={op.operator_id} className="border-t">
                    <td className="px-3 py-2 text-slate-500">
                      {op.rank ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        to={`/periods/${periodId}/operators/${op.operator_id}`}
                        className="text-slate-900 hover:underline"
                      >
                        {op.operator_name}
                      </Link>
                      {op.has_critical_errors && (
                        <span
                          className="ml-2 text-xs text-red-700"
                          title={op.critical_errors_reason ?? ""}
                        >
                          крит. ошибки
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <CallsCell
                        value={op.calls_handled}
                        per={opPeriodFor(op.operator_id)}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {op.evaluations_count}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ScoreCell value={op.tone_score} auto={op.auto_tone} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ScoreCell
                        value={op.completeness_score}
                        auto={op.auto_completeness}
                      />
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
                    <td className="px-3 py-2 text-slate-500 text-xs">
                      {op.excluded_reason ?? ""}
                      {op.override_reason && (
                        <div className="text-amber-700">
                          override: {op.override_reason}
                        </div>
                      )}
                    </td>
                    {canManagePeriods && (
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => {
                            setOpForm(op);
                            setOpError(null);
                          }}
                          className="text-slate-600 hover:text-slate-900 text-xs"
                        >
                          Настройки
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {scoring.data.operators.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManagePeriods ? 11 : 10}
                      className="px-3 py-6 text-center text-slate-400"
                    >
                      За этот период данных нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white border rounded p-4">
            <h2 className="font-medium mb-3">Супервайзеры</h2>
            <table className="w-full text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className="text-left py-1 font-medium">Имя</th>
                  <th className="text-center py-1 font-medium w-24">Норма</th>
                  <th className="text-right py-1 font-medium w-24">Премия</th>
                  {canManagePeriods && <th className="w-24"></th>}
                </tr>
              </thead>
              <tbody>
                {scoring.data.supervisors.map((s) => (
                  <tr key={s.supervisor_id} className="border-t">
                    <td className="py-2">{s.supervisor_name}</td>
                    <td className="py-2 text-center">
                      {s.norm_score === null ? (
                        <span className="text-slate-400">не задана</span>
                      ) : (
                        <ScoreCell value={s.norm_score} />
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {s.premium > 0 ? `${s.premium} ₽` : "—"}
                    </td>
                    {canManagePeriods && (
                      <td className="py-2 text-right">
                        <button
                          onClick={() => {
                            setSupForm({
                              id: s.supervisor_id,
                              name: s.supervisor_name,
                              norm: s.norm_score,
                            });
                            setSupError(null);
                          }}
                          disabled={isClosed}
                          className="text-slate-600 hover:text-slate-900 text-xs disabled:opacity-40"
                        >
                          Норма
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-right text-sm text-slate-600">
            Итого премий за период:{" "}
            <span className="font-medium text-slate-900">
              {scoring.data.total_premium} ₽
            </span>
          </div>
        </>
      )}

      {opForm && (
        <OperatorPeriodForm
          operatorName={opForm.operator_name}
          autoTone={opForm.auto_tone}
          autoCompleteness={opForm.auto_completeness}
          autoDialog={opForm.auto_dialog}
          initial={opPeriodFor(opForm.operator_id)}
          onClose={() => {
            setOpForm(null);
            setOpError(null);
          }}
          onSubmit={(payload) =>
            upsertOp.mutate({ operatorId: opForm.operator_id, payload })
          }
          submitting={upsertOp.isPending}
          error={opError}
        />
      )}

      {supForm && (
        <SupervisorPeriodForm
          supervisorName={supForm.name}
          initialNorm={supForm.norm}
          onClose={() => {
            setSupForm(null);
            setSupError(null);
          }}
          onSubmit={(payload) =>
            upsertSup.mutate({ supervisorId: supForm.id, payload })
          }
          submitting={upsertSup.isPending}
          error={supError}
        />
      )}

      {importOpen && (
        <ImportPremiumsModal
          periodId={periodId}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}
