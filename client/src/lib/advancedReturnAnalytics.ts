export type ReturnAnalyticsSale = {
  createdAt: string;
  total: number;
  isReturn?: boolean;
  returnReason?: string;
  items: Array<{ quantity: number }>;
};

export type ReturnRateEntry = { productId: string; productName: string; soldUnits: number; returnedUnits: number; returnRatePercent: number };

const monthBefore = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const previous = new Date(Date.UTC(year, Math.max(0, monthNumber - 2), 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
};

const getReturnSummary = (sales: ReturnAnalyticsSale[]) => sales.filter((sale) => sale.isReturn).reduce((summary, sale) => ({ receipts: summary.receipts + 1, units: summary.units + sale.items.reduce((total, item) => total + Math.abs(item.quantity), 0), value: summary.value + Math.abs(sale.total) }), { receipts: 0, units: 0, value: 0 });

export const getReturnReasonSummary = (sales: ReturnAnalyticsSale[]) => {
  const groups = new Map<string, { reason: string; receipts: number; units: number; value: number }>();
  sales.filter((sale) => sale.isReturn).forEach((sale) => {
    const reason = sale.returnReason?.trim() || "غير محدد";
    const existing = groups.get(reason) ?? { reason, receipts: 0, units: 0, value: 0 };
    groups.set(reason, { reason, receipts: existing.receipts + 1, units: existing.units + sale.items.reduce((total, item) => total + Math.abs(item.quantity), 0), value: existing.value + Math.abs(sale.total) });
  });
  return Array.from(groups.values()).sort((left, right) => right.receipts - left.receipts || right.value - left.value || left.reason.localeCompare(right.reason, "ar"));
};

export const getMonthlyReturnComparison = (sales: ReturnAnalyticsSale[], month: string) => {
  const previousMonth = monthBefore(month);
  const current = getReturnSummary(sales.filter((sale) => sale.createdAt.slice(0, 7) === month));
  const previous = getReturnSummary(sales.filter((sale) => sale.createdAt.slice(0, 7) === previousMonth));
  return { month, previousMonth, current, previous, receiptChange: current.receipts - previous.receipts, valueChange: current.value - previous.value };
};

export const getHighReturnRateProducts = (entries: ReturnRateEntry[], threshold = 10) => entries.filter((entry) => entry.soldUnits > 0 && entry.returnRatePercent >= threshold).sort((left, right) => right.returnRatePercent - left.returnRatePercent || right.returnedUnits - left.returnedUnits);
