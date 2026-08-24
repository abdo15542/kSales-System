export type LocalAnalysisProduct = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  lowStockAt: number;
  purchasePrice: number;
  supplierName?: string;
};

export type LocalAnalysisSale = {
  createdAt: string;
  paymentMethod?: "cash" | "credit";
  total?: number;
  items: Array<{ productId: string; quantity: number }>;
};

export type LocalAnalysisExpense = { amount: number; spentAt: string };
export type LocalAnalysisCollection = { amount: number; collectedAt: string };

export type DemandRisk = "urgent" | "watch" | "healthy" | "no-demand";

export type ProductDemandInsight = {
  productId: string;
  productName: string;
  sku: string;
  supplierName: string;
  currentStock: number;
  lowStockAt: number;
  recentUnits: number;
  priorUnits: number;
  averageDailyDemand: number;
  demandTrend: "rising" | "falling" | "stable" | "new" | "no-data";
  daysOfCover: number | null;
  risk: DemandRisk;
  recommendedOrderQuantity: number;
  estimatedOrderCost: number;
  explanation: string;
};

export type PurchaseRecommendationGroup = {
  supplierName: string;
  estimatedCost: number;
  units: number;
  urgentItems: number;
  entries: ProductDemandInsight[];
};

const DAY_MS = 86_400_000;

const dateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

const dayDistance = (from: string, to: string) => {
  const fromKey = dateKey(from);
  const toKey = dateKey(to);
  if (!fromKey || !toKey) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.parse(`${toKey}T00:00:00.000Z`) - Date.parse(`${fromKey}T00:00:00.000Z`)) / DAY_MS);
};

const labelForRisk = (risk: DemandRisk) => ({
  urgent: "خطر نفاد عاجل",
  watch: "يحتاج متابعة قريبة",
  healthy: "تغطية مخزون مطمئنة",
  "no-demand": "لا توجد حركة حديثة كافية",
}[risk]);

export const getProductDemandInsights = (products: LocalAnalysisProduct[], sales: LocalAnalysisSale[], now: Date = new Date()): ProductDemandInsight[] => {
  const today = dateKey(now);
  return products.map((product) => {
    let recentUnits = 0;
    let priorUnits = 0;
    sales.forEach((sale) => {
      const age = dayDistance(sale.createdAt, today);
      if (age < 0 || age >= 14) return;
      sale.items.forEach((item) => {
        if (item.productId !== product.id) return;
        if (age < 7) recentUnits += Math.max(0, numeric(item.quantity));
        else priorUnits += Math.max(0, numeric(item.quantity));
      });
    });
    const recentAverage = recentUnits / 7;
    const priorAverage = priorUnits / 7;
    const averageDailyDemand = recentAverage > 0 ? recentAverage : priorAverage;
    const demandTrend: ProductDemandInsight["demandTrend"] = recentUnits === 0 && priorUnits === 0 ? "no-data" : priorUnits === 0 ? "new" : recentAverage > priorAverage * 1.2 ? "rising" : recentAverage < priorAverage * 0.8 ? "falling" : "stable";
    const currentStock = Math.max(0, numeric(product.quantity));
    const daysOfCover = averageDailyDemand > 0 ? currentStock / averageDailyDemand : null;
    const targetStock = averageDailyDemand > 0 ? Math.max(Math.ceil(averageDailyDemand * 14), Math.max(1, product.lowStockAt) * 2) : Math.max(0, product.lowStockAt - currentStock);
    const recommendedOrderQuantity = Math.max(0, Math.ceil(targetStock - currentStock));
    const risk: DemandRisk = averageDailyDemand === 0 && currentStock > product.lowStockAt ? "no-demand" : daysOfCover !== null && daysOfCover <= 3 ? "urgent" : (daysOfCover !== null && daysOfCover <= 7) || currentStock <= product.lowStockAt ? "watch" : "healthy";
    const safeSupplier = product.supplierName?.trim() || "بدون مورد محدد";
    const displayCover = daysOfCover === null ? "غير متاح لغياب مبيعات حديثة" : `${Math.max(0, Math.floor(daysOfCover))} يوم`;
    const explanation = `${labelForRisk(risk)}: متوسط الطلب ${averageDailyDemand.toFixed(1)} وحدة/يوم، والتغطية ${displayCover}.`;
    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      supplierName: safeSupplier,
      currentStock,
      lowStockAt: Math.max(0, numeric(product.lowStockAt)),
      recentUnits,
      priorUnits,
      averageDailyDemand,
      demandTrend,
      daysOfCover,
      risk,
      recommendedOrderQuantity,
      estimatedOrderCost: recommendedOrderQuantity * Math.max(0, numeric(product.purchasePrice)),
      explanation,
    };
  }).sort((left, right) => {
    const rank: Record<DemandRisk, number> = { urgent: 0, watch: 1, healthy: 2, "no-demand": 3 };
    if (rank[left.risk] !== rank[right.risk]) return rank[left.risk] - rank[right.risk];
    return (left.daysOfCover ?? Number.POSITIVE_INFINITY) - (right.daysOfCover ?? Number.POSITIVE_INFINITY);
  });
};

export const getPurchaseRecommendations = (insights: ProductDemandInsight[]): PurchaseRecommendationGroup[] => {
  const groups = new Map<string, PurchaseRecommendationGroup>();
  insights.filter((entry) => entry.recommendedOrderQuantity > 0).forEach((entry) => {
    const current = groups.get(entry.supplierName) ?? { supplierName: entry.supplierName, estimatedCost: 0, units: 0, urgentItems: 0, entries: [] };
    current.entries.push(entry);
    current.estimatedCost += entry.estimatedOrderCost;
    current.units += entry.recommendedOrderQuantity;
    if (entry.risk === "urgent") current.urgentItems += 1;
    groups.set(entry.supplierName, current);
  });
  return Array.from(groups.values()).sort((left, right) => right.urgentItems - left.urgentItems || right.estimatedCost - left.estimatedCost);
};

export const getCashFlowForecast = (sales: LocalAnalysisSale[], expenses: LocalAnalysisExpense[], collections: LocalAnalysisCollection[], now: Date = new Date(), horizonDays = 7) => {
  const today = dateKey(now);
  let cashIncome = 0;
  let cashExpenses = 0;
  sales.forEach((sale) => {
    const age = dayDistance(sale.createdAt, today);
    if (age >= 0 && age < 14 && sale.paymentMethod === "cash") cashIncome += Math.max(0, numeric(sale.total));
  });
  collections.forEach((collection) => {
    const age = dayDistance(collection.collectedAt, today);
    if (age >= 0 && age < 14) cashIncome += Math.max(0, numeric(collection.amount));
  });
  expenses.forEach((expense) => {
    const age = dayDistance(expense.spentAt, today);
    if (age >= 0 && age < 14) cashExpenses += Math.max(0, numeric(expense.amount));
  });
  const days = Math.max(1, Math.min(30, Math.floor(horizonDays) || 7));
  const averageDailyIncome = cashIncome / 14;
  const averageDailyExpenses = cashExpenses / 14;
  const projectedIncome = averageDailyIncome * days;
  const projectedExpenses = averageDailyExpenses * days;
  const projectedNet = projectedIncome - projectedExpenses;
  const signal = projectedNet < 0 ? "negative" : projectedIncome > 0 && projectedNet / projectedIncome < 0.15 ? "watch" : "positive";
  const explanation = signal === "negative" ? "المصروفات المتوقعة تتجاوز التدفقات النقدية وفق آخر 14 يومًا." : signal === "watch" ? "هامش السيولة المتوقع محدود؛ راقب المصروفات والتحصيلات." : "التدفق النقدي المتوقع موجب وفق آخر 14 يومًا.";
  return { horizonDays: days, averageDailyIncome, averageDailyExpenses, projectedIncome, projectedExpenses, projectedNet, signal, explanation };
};
