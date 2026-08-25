export type ReconciliationHistoryEntry = {
  id: string;
  date: string;
  paymentMethod: "card" | "transfer";
  posTotal: number;
  bankStatementTotal: number;
  difference: number;
  note: string;
  reviewedAt: string;
};

export const filterReconciliationHistory = (entries: ReconciliationHistoryEntry[], query: string, paymentMethod: "all" | "card" | "transfer", status: "all" | "matched" | "difference") => {
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");
  return entries.filter((entry) => {
    const searchable = `${entry.date} ${entry.note} ${entry.paymentMethod}`.toLocaleLowerCase("ar");
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    const matchesMethod = paymentMethod === "all" || entry.paymentMethod === paymentMethod;
    const matchesStatus = status === "all" || (status === "matched" ? Math.abs(entry.difference) < 0.01 : Math.abs(entry.difference) >= 0.01);
    return matchesQuery && matchesMethod && matchesStatus;
  }).sort((left, right) => right.reviewedAt.localeCompare(left.reviewedAt));
};
