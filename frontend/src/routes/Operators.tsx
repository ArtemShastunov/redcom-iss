import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOperator,
  deactivateOperator,
  listOperators,
  updateOperator,
  type Operator,
  type OperatorIn,
} from "../api/operators";
import { usePermissions } from "../lib/usePermissions";
import OperatorForm from "../components/OperatorForm";

type StatusFilter = "all" | "active" | "inactive";

export default function Operators() {
  const qc = useQueryClient();
  const { canManageOperators } = usePermissions();

  const operators = useQuery({
    queryKey: ["operators"],
    queryFn: listOperators,
  });

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Operator | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: OperatorIn) => createOperator(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operators"] });
      setFormOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: (e: unknown) => {
      const status = (e as { status?: number }).status;
      setFormError(
        status === 409 ? "Оператор с таким ФИО уже существует" : "Не удалось сохранить",
      );
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OperatorIn }) =>
      updateOperator(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operators"] });
      setFormOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: (e: unknown) => {
      const status = (e as { status?: number }).status;
      setFormError(
        status === 409 ? "Оператор с таким ФИО уже существует" : "Не удалось сохранить",
      );
    },
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => deactivateOperator(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operators"] }),
  });

  const restoreMut = useMutation({
    mutationFn: (id: number) => updateOperator(id, { is_active: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operators"] }),
  });

  const filtered = useMemo(() => {
    if (!operators.data) return [] as Operator[];
    if (filter === "active") return operators.data.filter((o) => o.is_active);
    if (filter === "inactive") return operators.data.filter((o) => !o.is_active);
    return operators.data;
  }, [operators.data, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Операторы</h1>
        {canManageOperators && (
          <button
            onClick={() => {
              setEditing(null);
              setFormError(null);
              setFormOpen(true);
            }}
            className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            Новый оператор
          </button>
        )}
      </div>

      <div className="flex gap-2 text-sm">
        {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "px-3 py-1 rounded border " +
              (filter === f
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50")
            }
          >
            {f === "all" ? "Все" : f === "active" ? "Активные" : "Неактивные"}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">ФИО</th>
              <th className="text-left px-4 py-2 font-medium">Имя в файле премий</th>
              <th className="text-left px-4 py-2 font-medium w-32">Статус</th>
              {canManageOperators && <th className="w-40"></th>}
            </tr>
          </thead>
          <tbody>
            {operators.isLoading && (
              <tr>
                <td
                  colSpan={canManageOperators ? 4 : 3}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  Загрузка…
                </td>
              </tr>
            )}
            {!operators.isLoading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={canManageOperators ? 4 : 3}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  Нет операторов
                </td>
              </tr>
            )}
            {filtered.map((op) => (
              <tr key={op.id} className="border-t">
                <td className="px-4 py-2 text-slate-900">{op.full_name}</td>
                <td className="px-4 py-2 text-slate-600">
                  {op.premium_name ?? (
                    <span className="text-slate-400 text-xs">не задано</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {op.is_active ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                      Активен
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                      Деактивирован
                    </span>
                  )}
                </td>
                {canManageOperators && (
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        setEditing(op);
                        setFormError(null);
                        setFormOpen(true);
                      }}
                      className="text-slate-600 hover:text-slate-900 text-xs"
                    >
                      Правка
                    </button>
                    {op.is_active ? (
                      <button
                        onClick={() => {
                          if (confirm(`Деактивировать «${op.full_name}»?`)) {
                            deactivateMut.mutate(op.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-xs ml-3"
                      >
                        Деактивировать
                      </button>
                    ) : (
                      <button
                        onClick={() => restoreMut.mutate(op.id)}
                        className="text-emerald-700 hover:text-emerald-900 text-xs ml-3"
                      >
                        Восстановить
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <OperatorForm
          initial={editing ?? undefined}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
            setFormError(null);
          }}
          onSubmit={(payload) => {
            if (editing) {
              updateMut.mutate({ id: editing.id, payload });
            } else {
              createMut.mutate(payload);
            }
          }}
          submitting={createMut.isPending || updateMut.isPending}
          error={formError}
        />
      )}
    </div>
  );
}
