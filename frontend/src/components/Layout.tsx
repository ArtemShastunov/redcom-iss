import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth";
import { useMe } from "../lib/useMe";
import { usePermissions } from "../lib/usePermissions";
import ProfileModal from "./ProfileModal";

const ROLE_LABEL: Record<string, string> = {
  supervisor: "Супервайзер",
  head: "Начальник ИСС",
  admin: "Админ",
  operator: "Оператор",
};

export default function Layout() {
  const me = useMe();
  const { canManageOperators, canManageUsers, isOperator } = usePermissions();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);

  const doLogout = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.clear();
      navigate("/login", { replace: true });
    },
  });

  const navLinkCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm ${isActive ? "text-slate-900 font-medium" : "text-slate-600 hover:text-slate-900"}`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold text-slate-900">
              Redkom ISS
            </Link>
            <nav className="flex items-center gap-4">
              <NavLink to="/periods" className={navLinkCls}>
                {isOperator ? "Мои оценки" : "Периоды"}
              </NavLink>
              <NavLink to="/debtors" className={navLinkCls}>
                Дебиторка
              </NavLink>
              {canManageOperators && (
                <NavLink to="/operators" className={navLinkCls}>
                  Операторы
                </NavLink>
              )}
              {canManageUsers && (
                <NavLink to="/users" className={navLinkCls}>
                  Пользователи
                </NavLink>
              )}
            </nav>
          </div>
          {me.data && (
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => setProfileOpen(true)}
                className="text-slate-600 hover:text-slate-900"
                title="Изменить логин или пароль"
              >
                {me.data.full_name}{" "}
                <span className="text-slate-400">
                  ({ROLE_LABEL[me.data.role] ?? me.data.role})
                </span>
              </button>
              <button
                onClick={() => doLogout.mutate()}
                className="text-slate-500 hover:text-slate-900"
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {profileOpen && me.data && (
        <ProfileModal
          currentLogin={me.data.login}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
}