const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? String(month);
}

export function periodLabel(year: number, month: number): string {
  return `${monthName(month)} ${year}`;
}

export function formatOperatorName(name: string | null | undefined): string {
  if (!name) return "";
  if (name.trim() === "Голубятников Леша") return "Голубятников Алексей";
  return name;
}