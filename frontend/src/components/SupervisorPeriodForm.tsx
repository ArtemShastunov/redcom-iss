import { FormEvent, useState } from "react";
import Modal from "./Modal";
import type { SupervisorPeriodIn } from "../api/supervisorPeriods";

export default function SupervisorPeriodForm({
  supervisorName,
  initialNorm,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  supervisorName: string;
  initialNorm: number | null;
  onClose: () => void;
  onSubmit: (payload: SupervisorPeriodIn) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [norm, setNorm] = useState<number | null>(initialNorm);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ norm_score: norm });
  }

  return (
    <Modal
      title={`Норма контроля: ${supervisorName}`}
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
            form="sup-period-form"
            disabled={submitting}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Сохранение…" : "Сохранить"}
          </button>
        </>
      }
    >
      <form id="sup-period-form" onSubmit={handleSubmit} className="space-y-3">
        {error && <div className="text-sm text-red-600">{error}</div>}

        <label className="block text-sm">
          <span className="text-slate-600">
            Выполнение нормы контроля звонков (§3.6 Положения)
          </span>
          <select
            value={norm ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setNorm(v === "" ? null : Number(v));
            }}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="">— не задано —</option>
            <option value={1}>+1 — норма выполнена (100%, без ошибок)</option>
            <option value={-1}>-1 — есть ошибки или норма не выполнена</option>
          </select>
        </label>
      </form>
    </Modal>
  );
}
