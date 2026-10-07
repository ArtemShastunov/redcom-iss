import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-3xl font-semibold mb-2">404</h1>
      <p className="text-slate-500 mb-4">Страница не найдена</p>
      <Link to="/" className="text-slate-900 underline">
        На главную
      </Link>
    </div>
  );
}
