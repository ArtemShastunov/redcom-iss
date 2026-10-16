import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import { changeCredentials } from "../api/auth";

export default function ProfileModal({
  currentLogin,
  onClose,
}: {
  currentLogin: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newLogin, setNewLogin] = useState(currentLogin);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutate = useMutation({
    mutationFn: () =>
      changeCredentials({
        current_password: currentPassword,
        new_login: newLogin.trim() !== currentLogin ? newLogin.trim() : null,
        new_password: newPassword || null,
        new_password_confirm: newPasswordConfirm || null,
      }),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      setSuccess("Сохранено");
      setError(null);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    },
    onError: (e: unknown) => {
      const status = (e as { status?: number }).status;
      const detail = (e as { detail?: string }).detail;
      setSuccess(null);
      if (status === 401) setError("Неверный текущий пароль");
      else if (status === 409) setError("Такой логин уже занят");
      else if (status === 400) setError(String(detail ?? "Проверьте поля"));
      else setError("Не удалось сохранить");
    },
  });

  const passwordMismatch =
    newPasswordConfirm.length > 0 && newPassword !== newPasswordConfirm;
  const nothingChanged =
    newLogin.trim() === currentLogin && newPassword.length === 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!currentPassword) {
      setError("Введите текущий пароль");
      return;
    }
    if (passwordMismatch) {
      setError("Новые пароли не совпадают");
      return;
    }
    if (nothingChanged) {
      setError("Вы ничего не изменили");
      return;
    }
    mutate.mutate();
  }

  return (
    <Modal
      title="Профиль"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Закрыть
          </button>
          <button
            type="submit"
            form="profile-form"
            disabled={mutate.isPending}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {mutate.isPending ? "Сохранение…" : "Сохранить"}
          </button>
        </>
      }
    >
      <form id="profile-form" onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
            {success}
          </div>
        )}

        <label className="block text-sm">
          <span className="text-slate-600">Логин</span>
          <input
            type="text"
            value={newLogin}
            onChange={(e) => setNewLogin(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono"
          />
        </label>

        <div className="border-t pt-3 space-y-3">
          <div className="text-sm font-medium text-slate-700">
            Сменить пароль (оставьте поля пустыми, если не нужно)
          </div>
          <label className="block text-sm">
            <span className="text-slate-600">Новый пароль</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Повторите новый пароль</span>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono"
            />
            {passwordMismatch && (
              <span className="text-xs text-red-600 mt-1 block">
                Пароли не совпадают
              </span>
            )}
          </label>
        </div>

        <div className="border-t pt-3">
          <label className="block text-sm">
            <span className="text-slate-600">
              Текущий пароль <span className="text-red-600">*</span>
            </span>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              Нужен для подтверждения изменения логина или пароля
            </span>
          </label>
        </div>
      </form>
    </Modal>
  );
}
