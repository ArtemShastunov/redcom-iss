export default function StatusBadge({ status }: { status: "open" | "closed" }) {
  const cls =
    status === "open"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-slate-200 text-slate-700";
  const label = status === "open" ? "Открыт" : "Закрыт";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
