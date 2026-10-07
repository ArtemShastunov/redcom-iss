import { FormEvent, useState } from "react";
import Modal from "./Modal";
import type { OperatorPeriod, OperatorPeriodIn } from "../api/operatorPeriods";

function NumField({
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
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
      />
    </label>
  );
}

function ScoreOverrideSelect({
  value,
  onChange,
  label,
  auto,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  auto: number;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">
        {label}{" "}
        <span className="text-slate-400 text-xs">
          (авто: {auto > 0 ? `+${auto}` : auto})
        </span>
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
      >
        <option value="">— использовать авторасчёт —</option>
        <option value={1}>+1 — макс.</option>
        <option value={0}>0 — норма</option>
        <option value={-1}>-1 — плохо</option>
      </select>
    </label>
  );
}

export default function OperatorPeriodForm({
  operatorName,
  autoTone,
  autoCompleteness,
  autoDialog,
  initial,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  operatorName: string;
  autoTone: number;
  autoCompleteness: number;
  autoDialog: number;
  initial: OperatorPeriod | null;
  onClose: () => void;
  onSubmit: (payload: OperatorPeriodIn) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [callsIncoming, setCallsIncoming] = useState(initial?.calls_incoming ?? 0);
  const [callsOutgoing, setCallsOutgoing] = useState(initial?.calls_outgoing ?? 0);
  const [chatsBitrix, setChatsBitrix] = useState(initial?.chats_bitrix ?? 0);
  const [chatsMobile, setChatsMobile] = useState(initial?.chats_mobile ?? 0);

  const [hasCritical, setHasCritical] = useState(initial?.has_critical_errors ?? false);
  const [criticalReason, setCriticalReason] = useState(
    initial?.critical_errors_reason ?? "",
  );
  const [ovTone, setOvTone] = useState<number | null>(initial?.override_tone ?? null);
  const [ovComp, setOvComp] = useState<number | null>(
    initial?.override_completeness ?? null,
  );
  const [ovDialog, setOvDialog] = useState<number | null>(
    initial?.override_dialog ?? null,
  );
  const [ovReason, setOvReason] = useState(initial?.override_reason ?? "");

  const total = callsIncoming + callsOutgoing + chatsBitrix + chatsMobile;
  const hasAnyOverride = ovTone !== null || ovComp !== null || ovDialog !== null;
  const overrideIncomplete = hasAnyOverride && !ovReason.trim();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      calls_incoming: callsIncoming,
      calls_outgoing: callsOutgoing,
      chats_bitrix: chatsBitrix,
      chats_mobile: chatsMobile,
      has_critical_errors: hasCritical,
      critical_errors_reason: hasCritical ? criticalReason || null : null,
      override_tone: ovTone,
      override_completeness: ovComp,
      override_dialog: ovDialog,
      override_reason: hasAnyOverride ? ovReason || null : null,
    });
  }

  return (
    <Modal
      title={`Настройки: ${operatorName}`}
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
            form="op-period-form"
            disabled={submitting || overrideIncomplete}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Сохранение…" : "Сохранить"}
          </button>
        </>
      }
    >
      <form id="op-period-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-sm text-red-600">{error}</div>}

        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">
            Обращения за период (из файла премий)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField value={callsIncoming} onChange={setCallsIncoming} label="Входящие (звонки)" />
            <NumField value={callsOutgoing} onChange={setCallsOutgoing} label="Исходящие (звонки)" />
            <NumField value={chatsBitrix} onChange={setChatsBitrix} label="Битрикс (чаты)" />
            <NumField value={chatsMobile} onChange={setChatsMobile} label="Мобилка (чаты)" />
          </div>
          <div className="text-sm text-slate-600 mt-2">
            Итого: <span className="font-medium text-slate-900">{total}</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasCritical}
              onChange={(e) => setHasCritical(e.target.checked)}
            />
            <span className="text-slate-700">Критические ошибки</span>
          </label>
          {hasCritical && (
            <textarea
              rows={2}
              value={criticalReason}
              onChange={(e) => setCriticalReason(e.target.value)}
              placeholder="Причина"
              className="mt-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          )}
        </div>

        <div className="border-t pt-4">
          <div className="text-sm font-medium text-slate-700 mb-2">
            Override производных оценок
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ScoreOverrideSelect value={ovTone} onChange={setOvTone} label="Тон" auto={autoTone} />
            <ScoreOverrideSelect
              value={ovComp}
              onChange={setOvComp}
              label="Полнота"
              auto={autoCompleteness}
            />
            <ScoreOverrideSelect
              value={ovDialog}
              onChange={setOvDialog}
              label="Диалог в 1С"
              auto={autoDialog}
            />
          </div>

          {hasAnyOverride && (
            <label className="block text-sm mt-3">
              <span className="text-slate-600">
                Причина override <span className="text-red-600">*</span>
              </span>
              <textarea
                rows={2}
                required
                value={ovReason}
                onChange={(e) => setOvReason(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              />
              {overrideIncomplete && (
                <div className="text-xs text-red-600 mt-1">
                  Причина обязательна, если задан хотя бы один override
                </div>
              )}
            </label>
          )}
        </div>
      </form>
    </Modal>
  );
}
