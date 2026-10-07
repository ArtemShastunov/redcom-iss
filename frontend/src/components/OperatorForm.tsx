import { FormEvent, useState } from "react";
import Modal from "./Modal";
import type { Operator, OperatorIn } from "../api/operators";

export default function OperatorForm({
  initial,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  initial?: Operator;
  onClose: () => void;
  onSubmit: (payload: OperatorIn) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [premiumName, setPremiumName] = useState(initial?.premium_name ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      full_name: fullName.trim(),
      premium_name: premiumName.trim() || null,
      is_active: isActive,
    });
  }

  const isEdit = Boolean(initial);

  return (
    <Modal
      title={isEdit ? "Редактирование оператора" : "Новый оператор"}
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
            form="op-form"
            disabled={submitting || !fullName.trim()}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Сохранение…" : "Сохранить"}
          </button>
        </>
      }
    >
      <form id="op-form" onSubmit={handleSubmit} className="space-y-3">
        {error && <div className="text-sm text-red-600">{error}</div>}

        <label className="block text-sm">
          <span className="text-slate-600">ФИО</span>
          <input
            type="text"
            required
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">
            Имя в файле премий{" "}
            <span className="text-slate-400 text-xs">
              (например, «Мещеряков Д.Н.» — нужно для автосопоставления при импорте)
            </span>
          </span>
          <input
            type="text"
            value={premiumName}
            onChange={(e) => setPremiumName(e.target.value)}
            placeholder="Фамилия И.О."
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="text-slate-700">Активен</span>
        </label>
      </form>
    </Modal>
  );
}
