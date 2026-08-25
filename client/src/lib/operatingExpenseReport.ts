export type OperatingExpenseEntry = { amount: number; category: string; spentAt: string; note?: string };

export type OperatingExpenseRow = { category: string; total: number; count: number; notes: string[] };

export const getOperatingExpenseReport = (entries: OperatingExpenseEntry[], month: string): OperatingExpenseRow[] => {
  const grouped = new Map<string, OperatingExpenseRow>();
  entries.filter((entry) => entry.spentAt.slice(0, 7) === month && Number(entry.amount) > 0).forEach((entry) => {
    const category = entry.category.trim() || "أخرى";
    const current = grouped.get(category) ?? { category, total: 0, count: 0, notes: [] };
    current.total += Number(entry.amount);
    current.count += 1;
    if (entry.note?.trim()) current.notes.push(entry.note.trim());
    grouped.set(category, current);
  });
  return Array.from(grouped.values()).sort((left, right) => right.total - left.total);
};
