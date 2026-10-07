import { FormEvent, useState } from "react";
import Modal from "./Modal";
import type { Evaluation, EvaluationIn } from "../api/evaluations";

interface SupervisorOption {
  id: number;
  full_name: string;
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  // "2026-09-03T00:00:00" -> "2026-09-03T00:00"
  return iso.slice(0, 16);
}

function ScoreSelect({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
      >
        <option value={1}>+1 — отлично</option>
        <option value={0}>0 — норма</option>
        <option value={-1}>-1 — плохо</option>
      </select>
    </label>
  );
}

export default function EvaluationForm({
  periodId,
  operatorId,
  initial,
  supervisorOptions,
  defaultSupervisorId,
  canChooseSupervisor,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  periodId: number;
  operatorId: number;
  initial?: Evaluation;
  supervisorOptions: SupervisorOption[];
  defaultSupervisorId: number | null;
  canChooseSupervisor: boolean;
  onClose: () => void;
  onSubmit: (payload: EvaluationIn) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [callDate, setCallDate] = useState(toLocalInput(initial?.call_date));
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [contractNumber, setContractNumber] = useState(initial?.contract_number ?? "");
  const [tone, setTone] = useState(initial?.tone ?? 0);
  const [completeness, setCompleteness] = useState(initial?.completeness ?? 0);
  const [dialog1c, setDialog1c] = useState(initial?.dialog_1c ?? 0);
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [whatWas, setWhatWas] = useState(initial?.what_was ?? "");
  const [howShouldBe, setHowShouldBe] = useState(initial?.how_should_be ?? "");
  const [impact, setImpact] = useState(initial?.impact ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [supervisorId, setSupervisorId] = useState<number | null>(
    initial?.supervisor.id ?? defaultSupervisorId,
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      period_id: periodId,
      operator_id: operatorId,
      supervisor_id: supervisorId,
      call_date: callDate,
      phone,
      contract_number: contractNumber || null,
      tone,
      completeness,
      dialog_1c: dialog1c,
      question: question || null,
      what_was: whatWas || null,
      how_should_be: howShouldBe || null,
      impact: impact || null,
      comment: comment || null,
    });
  }

  const isEdit = Boolean(initial);

  return (
    <Modal
      title={isEdit ? "Редактирование оценки" : "Новая оценка"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            form="eval-form"
            disabled={submitting}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Сохранение…" : "Сохранить"}
          </button>
        </>
      }
    >
      <form id="eval-form" onSubmit={handleSubmit} className="space-y-3">
        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-600">Дата и время звонка</span>
            <input
              type="datetime-local"
              required
              value={callDate}
              onChange={(e) => setCallDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Телефон</span>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-600">Номер договора</span>
            <input
              type="text"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>

          {canChooseSupervisor && (
            <label className="block text-sm">
              <span className="text-slate-600">Супервайзер</span>
              <select
                value={supervisorId ?? ""}
                onChange={(e) => setSupervisorId(Number(e.target.value) || null)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              >
                <option value="">— выберите —</option>
                {supervisorOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <ScoreSelect value={tone} onChange={setTone} label="Тон" />
          <ScoreSelect
            value={completeness}
            onChange={setCompleteness}
            label="Полнота ответа"
          />
          <ScoreSelect value={dialog1c} onChange={setDialog1c} label="Диалог в 1С" />
        </div>

        <label className="block text-sm">
          <span className="text-slate-600">Вопрос клиента</span>
          <textarea
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Что было</span>
          <textarea
            rows={3}
            value={whatWas}
            onChange={(e) => setWhatWas(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Как надо было</span>
          <textarea
            rows={3}
            value={howShouldBe}
            onChange={(e) => setHowShouldBe(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">На что повлияло</span>
          <textarea
            rows={2}
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Дополнительные комментарии</span>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
      </form>
    </Modal>
  );
}
