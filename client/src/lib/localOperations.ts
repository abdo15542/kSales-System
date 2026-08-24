export type DailySalesGoal = {
  date: string;
  target: number;
  setAt: string;
};

export type MonthlySalesGoal = {
  month: string;
  target: number;
  setAt: string;
};

export type StocktakeRecord = {
  id: string;
  runId?: string;
  productId: string;
  productName: string;
  sku: string;
  recordedQuantity: number;
  actualQuantity: number;
  difference: number;
  valueDifference: number;
  recordedAt: string;
  note: string;
};

export type BulkStocktakeItem = {
  productId: string;
  productName: string;
  sku: string;
  recordedQuantity: number;
  actualQuantity: number;
  purchasePrice: number;
};

type GoalProgress = {
  active: boolean;
  target: number;
  revenue: number;
  achievement: number;
  remaining: number;
  met: boolean;
};

type ReturnableSale = {
  id: string;
  total: number;
  paymentMethod: "cash" | "credit";
  items: Array<{ productId: string; quantity: number }>;
  isReturn?: boolean;
  returnOfSaleId?: string;
};

type SaleDebt = { note?: string; paid: number };

const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

export const getDailyGoalProgress = (goal: DailySalesGoal | undefined, revenue: number): GoalProgress => {
  const target = Math.max(0, finite(goal?.target));
  const recordedRevenue = Math.max(0, finite(revenue));
  const active = target > 0;
  return {
    active,
    target,
    revenue: recordedRevenue,
    achievement: active ? (recordedRevenue / target) * 100 : 0,
    remaining: active ? Math.max(0, target - recordedRevenue) : 0,
    met: active && recordedRevenue >= target,
  };
};

export const getMonthlyGoalProgress = (goal: MonthlySalesGoal | undefined, revenue: number): GoalProgress => {
  const target = Math.max(0, finite(goal?.target));
  const recordedRevenue = Math.max(0, finite(revenue));
  const active = target > 0;
  return {
    active,
    target,
    revenue: recordedRevenue,
    achievement: active ? (recordedRevenue / target) * 100 : 0,
    remaining: active ? Math.max(0, target - recordedRevenue) : 0,
    met: active && recordedRevenue >= target,
  };
};

export const createStocktakeRecord = (input: Omit<StocktakeRecord, "difference" | "valueDifference"> & { purchasePrice: number }): StocktakeRecord => {
  const recordedQuantity = Math.max(0, finite(input.recordedQuantity));
  const actualQuantity = Math.max(0, finite(input.actualQuantity));
  const difference = actualQuantity - recordedQuantity;
  return {
    id: input.id,
    ...(input.runId ? { runId: input.runId } : {}),
    productId: input.productId,
    productName: input.productName,
    sku: input.sku,
    recordedQuantity,
    actualQuantity,
    difference,
    valueDifference: difference * Math.max(0, finite(input.purchasePrice)),
    recordedAt: input.recordedAt,
    note: input.note.trim(),
  };
};

export const getStocktakeRecordSummary = (records: StocktakeRecord[]) => records.reduce((summary, record) => ({
  count: summary.count + 1,
  shortageUnits: summary.shortageUnits + Math.max(0, -finite(record.difference)),
  surplusUnits: summary.surplusUnits + Math.max(0, finite(record.difference)),
  shortageValue: summary.shortageValue + Math.max(0, -finite(record.valueDifference)),
  surplusValue: summary.surplusValue + Math.max(0, finite(record.valueDifference)),
}), { count: 0, shortageUnits: 0, surplusUnits: 0, shortageValue: 0, surplusValue: 0 });

export const createBulkStocktakeRecords = (items: BulkStocktakeItem[], runId: string, recordedAt: string, note: string) => items.map((item) => createStocktakeRecord({
  id: `${runId}-${item.productId}`,
  runId,
  productId: item.productId,
  productName: item.productName,
  sku: item.sku,
  recordedQuantity: item.recordedQuantity,
  actualQuantity: item.actualQuantity,
  purchasePrice: item.purchasePrice,
  recordedAt,
  note,
}));

export const getBulkStocktakeSummary = (records: StocktakeRecord[]) => ({
  reviewedProducts: records.length,
  adjustedProducts: records.filter((record) => finite(record.difference) !== 0).length,
  ...getStocktakeRecordSummary(records),
});

export type StocktakeRunSummary = {
  runId: string;
  recordedAt: string;
  note: string;
  products: number;
  adjustedProducts: number;
  shortageUnits: number;
  surplusUnits: number;
  shortageValue: number;
  surplusValue: number;
};

export const getStocktakeRunComparison = (records: StocktakeRecord[]) => {
  const grouped = new Map<string, StocktakeRecord[]>();
  records.forEach((record) => {
    const runId = record.runId || `${record.recordedAt}|${record.note}`;
    grouped.set(runId, [...(grouped.get(runId) ?? []), record]);
  });
  const runs = Array.from(grouped.entries()).map(([runId, runRecords]) => {
    const summary = getBulkStocktakeSummary(runRecords);
    return {
      runId,
      recordedAt: runRecords[0]?.recordedAt || "",
      note: runRecords[0]?.note || "جرد محلي",
      products: summary.reviewedProducts,
      adjustedProducts: summary.adjustedProducts,
      shortageUnits: summary.shortageUnits,
      surplusUnits: summary.surplusUnits,
      shortageValue: summary.shortageValue,
      surplusValue: summary.surplusValue,
    } satisfies StocktakeRunSummary;
  }).sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
  const [current, previous] = runs;
  return {
    runs,
    current: current ?? null,
    previous: previous ?? null,
    adjustedProductChange: current && previous ? current.adjustedProducts - previous.adjustedProducts : null,
    shortageValueChange: current && previous ? current.shortageValue - previous.shortageValue : null,
  };
};

export const getSaleReturnableItems = (sale: ReturnableSale, sales: ReturnableSale[]) => {
  const returnedByProductId = new Map<string, number>();
  sales.filter((entry) => entry.returnOfSaleId === sale.id).forEach((entry) => entry.items.forEach((item) => {
    returnedByProductId.set(item.productId, (returnedByProductId.get(item.productId) ?? 0) + Math.abs(finite(item.quantity)));
  }));
  return sale.items.filter((item) => finite(item.quantity) > 0).map((item) => {
    const soldQuantity = Math.max(0, finite(item.quantity));
    const returnedQuantity = Math.min(soldQuantity, returnedByProductId.get(item.productId) ?? 0);
    return { productId: item.productId, soldQuantity, returnedQuantity, remainingQuantity: Math.max(0, soldQuantity - returnedQuantity) };
  });
};

export const getSaleReturnEligibility = (sale: ReturnableSale, sales: ReturnableSale[], debts: SaleDebt[]) => {
  if (sale.isReturn || sale.returnOfSaleId || sale.total <= 0 || !sale.items.some((item) => finite(item.quantity) > 0)) return { allowed: false, reason: "الفاتورة ليست عملية بيع قابلة للإرجاع." };
  const saleReference = sale.id.slice(-5);
  if (sale.paymentMethod === "credit" && debts.some((debt) => (debt.note || "").includes(saleReference) && finite(debt.paid) > 0)) return { allowed: false, reason: "لا يمكن إرجاع فاتورة آجلة بعد تحصيل جزء منها؛ صحّح الذمة أولًا." };
  if (!getSaleReturnableItems(sale, sales).some((item) => item.remainingQuantity > 0)) return { allowed: false, reason: "تم إرجاع كامل كميات هذه الفاتورة مسبقًا." };
  return { allowed: true, reason: "" };
};
