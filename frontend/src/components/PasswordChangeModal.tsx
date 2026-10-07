import { FormEvent, useState } from "react";
import Modal from "./Modal";

export default function PasswordChangeModal({
  userLogin,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  userLogin: string;
  onClose: () => void;
  onSubmit: (newPassword: string) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");

  const mismatch = repeat.length > 0 && password !== repeat;
  const canSubmit = password.length > 0 && password === repeat;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(password);
  }

  return (
    <Modal
      title={`Смена пароля: ${userLogin}`}
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
            form="pw-form"
            disabled={submitting || !canSubmit}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Сохранение…" : "Сменить пароль"}
          </button>
        </>
      }
    >
      <form id="pw-form" onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm">
          <span className="text-slate-600">Новый пароль</span>
          <input
            type="password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Повторите пароль</span>
          <input
            type="password"
            required
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
          {mismatch && (
            <span className="text-xs text-red-600 mt-1 block">
              Пароли не совпадают
            </span>
          )}
        </label>
      </form>
    </Modal>
  );
}
