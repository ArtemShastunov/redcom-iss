import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changePassword,
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
  type User,
  type UserIn,
  type UserPatch,
  type UserRole,
} from "../api/users";
import { useMe } from "../lib/useMe";
import { usePermissions } from "../lib/usePermissions";
import UserForm from "../components/UserForm";
import PasswordChangeModal from "../components/PasswordChangeModal";

const ROLE_LABEL: Record<UserRole, string> = {
  supervisor: "Супервайзер",
  head: "Начальник ИСС",
  admin: "Админ",
};

export default function Users() {
  const qc = useQueryClient();
  const me = useMe();
  const { canManageUsers } = usePermissions();

  const users = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    enabled: canManageUsers,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [pwUser, setPwUser] = useState<User | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: UserIn) => createUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setFormOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: (e: unknown) => {
      const status = (e as { status?: number }).status;
      setFormError(
        status === 409 ? "Пользователь с таким логином уже существует" : "Не удалось сохранить",
      );
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UserPatch }) =>
      updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setFormOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: (e: unknown) => {
      const status = (e as { status?: number }).status;
      const detail = (e as { detail?: string }).detail;
      setFormError(
        status === 400 && detail
          ? String(detail)
          : "Не удалось сохранить",
      );
    },
  });

  const pwMut = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      changePassword(id, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setPwUser(null);
      setPwError(null);
    },
    onError: () => setPwError("Не удалось изменить пароль"),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const restoreMut = useMutation({
    mutationFn: (id: number) => updateUser(id, { is_active: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const sorted = useMemo(() => {
    if (!users.data) return [] as User[];
    return [...users.data].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return a.id - b.id;
    });
  }, [users.data]);

  if (!canManageUsers) {
    return (
      <div className="text-slate-500">
        Раздел доступен только администратору.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Пользователи</h1>
        <button
          onClick={() => {
            setEditing(null);
            setFormError(null);
            setFormOpen(true);
          }}
          className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800"
        >
          Новый пользователь
        </button>
      </div>

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Логин</th>
              <th className="text-left px-4 py-2 font-medium">ФИО</th>
              <th className="text-left px-4 py-2 font-medium">Роль</th>
              <th className="text-left px-4 py-2 font-medium w-32">Статус</th>
              <th className="w-64"></th>
            </tr>
          </thead>
          <tbody>
            {users.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Загрузка…
                </td>
              </tr>
            )}
            {sorted.length === 0 && !users.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Нет пользователей
                </td>
              </tr>
            )}
            {sorted.map((u) => {
              const isSelf = u.id === me.data?.id;
              return (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2 text-slate-900 font-mono text-xs">
                    {u.login}
                    {isSelf && (
                      <span className="ml-2 text-xs text-slate-400">(вы)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-900">{u.full_name}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {ROLE_LABEL[u.role]}
                  </td>
                  <td className="px-4 py-2">
                    {u.is_active ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        Активен
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                        Деактивирован
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        setEditing(u);
                        setFormError(null);
                        setFormOpen(true);
                      }}
                      className="text-slate-600 hover:text-slate-900 text-xs"
                    >
                      Правка
                    </button>
                    <button
                      onClick={() => {
                        setPwUser(u);
                        setPwError(null);
                      }}
                      className="text-slate-600 hover:text-slate-900 text-xs ml-3"
                    >
                      Сменить пароль
                    </button>
                    {!isSelf && (
                      <>
                        {u.is_active ? (
                          <button
                            onClick={() => {
                              if (confirm(`Деактивировать «${u.login}»?`)) {
                                deactivateMut.mutate(u.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-xs ml-3"
                          >
                            Деактивировать
                          </button>
                        ) : (
                          <button
                            onClick={() => restoreMut.mutate(u.id)}
                            className="text-emerald-700 hover:text-emerald-900 text-xs ml-3"
                          >
                            Восстановить
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <UserForm
          initial={editing ?? undefined}
          isSelf={editing?.id === me.data?.id}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
            setFormError(null);
          }}
          onSubmit={(payload) => {
            if (editing) {
              updateMut.mutate({
                id: editing.id,
                payload: payload as UserPatch,
              });
            } else {
              createMut.mutate(payload as UserIn);
            }
          }}
          submitting={createMut.isPending || updateMut.isPending}
          error={formError}
        />
      )}

      {pwUser && (
        <PasswordChangeModal
          userLogin={pwUser.login}
          onClose={() => {
            setPwUser(null);
            setPwError(null);
          }}
          onSubmit={(password) =>
            pwMut.mutate({ id: pwUser.id, password })
          }
          submitting={pwMut.isPending}
          error={pwError}
        />
      )}
    </div>
  );
}
