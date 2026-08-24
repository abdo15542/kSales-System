export type DailySalesGoal = {
  date: string;
  target: number;
  setAt: string;
};

export type StocktakeRecord = {
  id: string;
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

export const createStocktakeRecord = (input: Omit<StocktakeRecord, "difference" | "valueDifference"> & { purchasePrice: number }): StocktakeRecord => {
  const recordedQuantity = Math.max(0, finite(input.recordedQuantity));
  const actualQuantity = Math.max(0, finite(input.actualQuantity));
  const difference = actualQuantity - recordedQuantity;
  return {
    id: input.id,
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

export const getSaleReturnEligibility = (sale: ReturnableSale, sales: ReturnableSale[], debts: SaleDebt[]) => {
  if (sale.isReturn || sale.returnOfSaleId || sale.total <= 0 || !sale.items.some((item) => finite(item.quantity) > 0)) return { allowed: false, reason: "الفاتورة ليست عملية بيع قابلة للإرجاع." };
  if (sales.some((entry) => entry.returnOfSaleId === sale.id)) return { allowed: false, reason: "تم تسجيل إرجاع لهذه الفاتورة مسبقًا." };
  const saleReference = sale.id.slice(-5);
  if (sale.paymentMethod === "credit" && debts.some((debt) => (debt.note || "").includes(saleReference) && finite(debt.paid) > 0)) return { allowed: false, reason: "لا يمكن إرجاع فاتورة آجلة بعد تحصيل جزء منها؛ صحّح الذمة أولًا." };
  return { allowed: true, reason: "" };
};
