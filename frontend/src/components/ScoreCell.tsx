export default function ScoreCell({
  value,
  auto,
}: {
  value: number;
  auto?: number;
}) {
  const cls =
    value === 1
      ? "text-emerald-700"
      : value === -1
        ? "text-red-700"
        : "text-slate-500";
  const overridden = auto !== undefined && auto !== value;
  return (
    <span className={cls}>
      {value > 0 ? `+${value}` : value}
      {overridden && (
        <span className="text-amber-600 ml-1 text-xs" title={`Авторасчёт: ${auto}`}>
          *
        </span>
      )}
    </span>
  );
}
