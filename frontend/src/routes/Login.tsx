import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../api/auth";
import { useMe } from "../lib/useMe";

export default function Login() {
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const me = useMe();

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    "/";

  const doLogin = useMutation({
    mutationFn: () => login(loginValue, password),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      navigate(from, { replace: true });
    },
    onError: () => {
      setError("Неверный логин или пароль");
    },
  });

  if (me.data) {
    return <Navigate to="/" replace />;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    doLogin.mutate();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="bg-white shadow-sm rounded-lg p-8 w-full max-w-sm border"
      >
        <h1 className="text-xl font-semibold mb-6 text-center">Вход</h1>

        <label className="block text-sm mb-3">
          <span className="text-slate-600">Логин</span>
          <input
            type="text"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            autoFocus
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </label>

        <label className="block text-sm mb-4">
          <span className="text-slate-600">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </label>

        {error && (
          <div className="text-sm text-red-600 mb-3">{error}</div>
        )}

        <button
          type="submit"
          disabled={doLogin.isPending}
          className="w-full rounded bg-slate-900 text-white py-2
                     hover:bg-slate-800 disabled:opacity-50"
        >
          {doLogin.isPending ? "Вход…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
