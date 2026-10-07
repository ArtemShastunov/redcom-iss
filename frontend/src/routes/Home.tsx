import { Link } from "react-router-dom";
import { useMe } from "../lib/useMe";

export default function Home() {
  const me = useMe();
  if (!me.data) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Главная</h1>
      <p className="text-slate-600">Привет, {me.data.full_name}.</p>
      <div className="flex gap-4 text-sm">
        <Link to="/periods" className="text-slate-900 underline">
          Перейти к периодам
        </Link>
      </div>
    </div>
  );
}
