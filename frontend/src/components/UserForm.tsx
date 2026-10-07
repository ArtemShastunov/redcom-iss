import { FormEvent, useState } from "react";
import Modal from "./Modal";
import type { User, UserIn, UserRole } from "../api/users";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "supervisor", label: "Супервайзер" },
  { value: "head", label: "Начальник ИСС" },
  { value: "admin", label: "Админ" },
];

export default function UserForm({
  initial,
  isSelf,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  initial?: User;
  isSelf: boolean;
  onClose: () => void;
  onSubmit: (payload: UserIn | { full_name: string; role: UserRole; is_active: boolean }) => void;
  submitting: boolean;
  error: string | null;
}) {
  const isEdit = Boolean(initial);
  const [login, setLogin] = useState(initial?.login ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [role, setRole] = useState<UserRole>(initial?.role ?? "supervisor");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isEdit) {
      onSubmit({
        full_name: fullName.trim(),
        role,
        is_active: isActive,
      });
    } else {
      onSubmit({
        login: login.trim(),
        password,
        full_name: fullName.trim(),
        role,
      });
    }
  }

  const canSubmit =
    fullName.trim().length > 0 &&
    (isEdit || (login.trim().length > 0 && password.length > 0));

  return (
    <Modal
      title={isEdit ? `Редактирование: ${initial?.login}` : "Новый пользователь"}
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
            form="user-form"
            disabled={submitting || !canSubmit}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Сохранение…" : "Сохранить"}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm">
          <span className="text-slate-600">Логин</span>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            disabled={isEdit}
            required={!isEdit}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 disabled:bg-slate-100"
          />
          {isEdit && (
            <span className="text-xs text-slate-400 mt-1 block">
              Логин нельзя изменить
            </span>
          )}
        </label>

        {!isEdit && (
          <label className="block text-sm">
            <span className="text-slate-600">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={1}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="text-slate-600">ФИО</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Роль</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={isSelf}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 disabled:bg-slate-100"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {isSelf && (
            <span className="text-xs text-slate-400 mt-1 block">
              Свою роль менять нельзя
            </span>
          )}
        </label>

        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSelf}
            />
            <span className="text-slate-700">Активен</span>
          </label>
        )}
      </form>
    </Modal>
  );
}
