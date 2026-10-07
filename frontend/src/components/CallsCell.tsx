import { useState } from "react";
import { OperatorPeriod } from "../api/operatorPeriods";

export default function CallsCell({
  value,
  per,
}: {
  value: number;
  per: OperatorPeriod | null;
}) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  if (!per) {
    return <span className="text-slate-600">{value}</span>;
  }

  return (
    <>
      <span
        className="text-slate-600 cursor-help border-b border-dotted border-slate-400"
        onMouseEnter={(e) => setCoords({ x: e.clientX, y: e.clientY })}
        onMouseMove={(e) => setCoords({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setCoords(null)}
      >
        {value}
      </span>
      {coords && (
        <div
          className="fixed z-50 pointer-events-none
                     bg-slate-900 text-white text-xs rounded shadow-lg
                     px-3 py-2 whitespace-nowrap"
          style={{ left: coords.x + 14, top: coords.y + 14 }}
        >
          <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
            <span className="text-slate-300 text-left">Входящие:</span>
            <span className="text-right font-medium">{per.calls_incoming}</span>
            <span className="text-slate-300 text-left">Исходящие:</span>
            <span className="text-right font-medium">{per.calls_outgoing}</span>
            <span className="text-slate-300 text-left">Битрикс:</span>
            <span className="text-right font-medium">{per.chats_bitrix}</span>
            <span className="text-slate-300 text-left">Мобилка:</span>
            <span className="text-right font-medium">{per.chats_mobile}</span>
          </div>
        </div>
      )}
    </>
  );
}
