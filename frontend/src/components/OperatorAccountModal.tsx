import { FormEvent, useState } from "react";
import Modal from "./Modal";
import type { Operator, OperatorAccountOut } from "../api/operators";

export default function OperatorAccountModal({
  operator,
  mode,
  onClose,
  onSubmit,
  submitting,
  error,
  result,
}: {
  operator: Operator;
  mode: "create" | "reset";
  onClose: () => void;
  onSubmit: (payload: { login?: string | null; password: string }) => void;
  submitting: boolean;
  error: string | null;
  result: OperatorAccountOut | null;
}) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState(
    mode === "create" ? "changeme2026" : "",
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      login: mode === "create" ? login.trim() || null : null,
      password,
    });
  }

  const title =
    mode === "create"
      ? `Создать аккаунт: ${operator.full_name}`
      : `Сменить пароль: ${operator.account_login}`;

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        result ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            Готово
          </button>
        ) : (
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
              form="acc-form"
              disabled={submitting || !password}
              className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting
                ? "Сохранение…"
                : mode === "create"
                  ? "Создать"
                  : "Сменить пароль"}
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-3 text-sm">
            <div className="text-emerald-900 font-medium mb-2">
              {mode === "create" ? "Аккаунт создан" : "Пароль изменён"}
            </div>
            <div className="space-y-1">
              <div>
                <span className="text-slate-500">Логин:</span>{" "}
                <span className="font-mono font-medium">{result.login}</span>
              </div>
              <div>
                <span className="text-slate-500">Пароль:</span>{" "}
                <span className="font-mono font-medium">{password}</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Сохраните логин и пароль — они показываются один раз. Отдайте их
            оператору.
          </div>
        </div>
      ) : (
        <form id="acc-form" onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          {mode === "create" && (
            <label className="block text-sm">
              <span className="text-slate-600">
                Логин (оставь пустым — сгенерируется из фамилии)
              </span>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="safronov"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="text-slate-600">Пароль</span>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              По умолчанию: changeme2026 — оператор потом сможет его сменить
            </span>
          </label>
        </form>
      )}
    </Modal>
  );
}
