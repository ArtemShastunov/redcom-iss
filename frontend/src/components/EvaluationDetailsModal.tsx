import type { Evaluation } from "../api/evaluations";
import Modal from "./Modal";
import ScoreCell from "./ScoreCell";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU");
}

export default function EvaluationDetailsModal({
  evaluation,
  onClose,
  showOperator = true,
}: {
  evaluation: Evaluation;
  onClose: () => void;
  showOperator?: boolean;
}) {
  const rows: [string, string | null][] = [
    ["Вопрос клиента", evaluation.question],
    ["Что было", evaluation.what_was],
    ["Как надо было", evaluation.how_should_be],
    ["На что повлияло", evaluation.impact],
    ["Дополнительные комментарии", evaluation.comment],
  ];

  return (
    <Modal
      title="Карточка оценки"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800"
        >
          Закрыть
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {showOperator && (
            <div>
              <div className="text-slate-500 text-xs mb-1">Оператор</div>
              <div className="font-medium">{evaluation.operator.full_name}</div>
            </div>
          )}
          <div>
            <div className="text-slate-500 text-xs mb-1">Оценил супервайзер</div>
            <div className="font-medium">{evaluation.supervisor.full_name}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs mb-1">Дата звонка</div>
            <div className="font-medium">{fmtDate(evaluation.call_date)}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs mb-1">Телефон</div>
            <div className="font-medium">{evaluation.phone}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs mb-1">Номер договора</div>
            <div className="font-medium">{evaluation.contract_number ?? "—"}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm border-t pt-4">
          <div className="text-center">
            <div className="text-slate-500 text-xs mb-1">Тон</div>
            <div className="text-lg">
              <ScoreCell value={evaluation.tone} />
            </div>
          </div>
          <div className="text-center">
            <div className="text-slate-500 text-xs mb-1">Полнота</div>
            <div className="text-lg">
              <ScoreCell value={evaluation.completeness} />
            </div>
          </div>
          <div className="text-center">
            <div className="text-slate-500 text-xs mb-1">Диалог в 1С</div>
            <div className="text-lg">
              <ScoreCell value={evaluation.dialog_1c} />
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          {rows.map(([label, value]) => (
            <div key={label}>
              <div className="text-slate-500 text-xs mb-1">{label}</div>
              <div className="text-sm whitespace-pre-wrap">
                {value && value.trim() ? (
                  value
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
