import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMe } from "../lib/useMe";

export default function ProtectedRoute() {
  const me = useMe();
  const location = useLocation();

  if (me.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Загрузка…
      </div>
    );
  }

  if (me.isError || !me.data) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
