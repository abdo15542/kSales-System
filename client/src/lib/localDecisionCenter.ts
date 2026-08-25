import type { DemandRisk, ProductDemandInsight } from "./localAnalysis";

export type DecisionCenterProduct = { id: string; name: string; quantity: number; purchasePrice: number; salePrice: number };
export type LocalDecisionAction = { id: string; priority: "urgent" | "watch" | "review"; title: string; detail: string; metric: string; page: "inventory" | "debts" | "reports" };

const riskRank: Record<LocalDecisionAction["priority"], number> = { urgent: 0, watch: 1, review: 2 };
const moneyMetric = (value: number) => `${Math.max(0, value).toFixed(2)} د.ل`;

export const getLocalDecisionCenter = ({
  insights,
  products,
  outstandingDebt,
  cashFlow,
}: {
  insights: ProductDemandInsight[];
  products: DecisionCenterProduct[];
  outstandingDebt: number;
  cashFlow: { signal: string; projectedNet: number; horizonDays: number };
}) => {
  const actions: LocalDecisionAction[] = [];
  const urgent = insights.filter((entry) => entry.risk === "urgent");
  const watch = insights.filter((entry) => entry.risk === "watch");
  const noDemandIds = new Set(insights.filter((entry) => entry.risk === "no-demand").map((entry) => entry.productId));
  const stagnantProducts = products.filter((product) => noDemandIds.has(product.id) && product.quantity > 0);
  const stagnantCapital = stagnantProducts.reduce((total, product) => total + Math.max(0, product.quantity) * Math.max(0, product.purchasePrice), 0);
  const priceRiskProducts = products.filter((product) => product.purchasePrice > 0 && product.salePrice <= product.purchasePrice);

  if (urgent.length) actions.push({ id: "restock-urgent", priority: "urgent", title: "شراء أصناف قبل النفاد", detail: `${urgent.slice(0, 3).map((entry) => entry.productName).join(" · ")}${urgent.length > 3 ? " · وغيرها" : ""}. التغطية لا تتجاوز 3 أيام وفق آخر مبيعات محلية.`, metric: `${urgent.length} أصناف`, page: "inventory" });
  if (cashFlow.signal !== "positive") actions.push({ id: "cash-flow", priority: cashFlow.signal === "negative" ? "urgent" : "watch", title: cashFlow.signal === "negative" ? "حماية سيولة المحل" : "راقب هامش السيولة", detail: `صافي التدفق المتوقع خلال ${cashFlow.horizonDays} أيام هو ${moneyMetric(cashFlow.projectedNet)}.`, metric: moneyMetric(Math.abs(cashFlow.projectedNet)), page: "reports" });
  if (outstandingDebt > 0 && cashFlow.signal !== "positive") actions.push({ id: "collect-debt", priority: "watch", title: "تسريع تحصيل الذمم", detail: "تحصيل جزء من الذمم القائمة قد يدعم السيولة قبل طلب شراء جديد.", metric: moneyMetric(outstandingDebt), page: "debts" });
  if (stagnantProducts.length) actions.push({ id: "stagnant-stock", priority: "review", title: "راجع المخزون بطيء الحركة", detail: `${stagnantProducts.slice(0, 3).map((product) => product.name).join(" · ")}${stagnantProducts.length > 3 ? " · وغيرها" : ""}. راجع السعر أو العرض أو موقع الرف قبل شراء كمية جديدة.`, metric: moneyMetric(stagnantCapital), page: "inventory" });
  if (priceRiskProducts.length) actions.push({ id: "price-risk", priority: "urgent", title: "راجع أسعار البيع غير المربحة", detail: `${priceRiskProducts.slice(0, 3).map((product) => product.name).join(" · ")}${priceRiskProducts.length > 3 ? " · وغيرها" : ""}. سعر البيع لا يتجاوز تكلفة الشراء.`, metric: `${priceRiskProducts.length} أصناف`, page: "inventory" });
  if (!actions.length && watch.length) actions.push({ id: "watch-stock", priority: "watch", title: "تابع الأصناف القريبة من حد التنبيه", detail: "لا توجد مخاطر عاجلة، لكن بعض الأصناف تحتاج مراجعة دورية قبل نفادها.", metric: `${watch.length} أصناف`, page: "inventory" });
  return { actions: actions.sort((left, right) => riskRank[left.priority] - riskRank[right.priority]), urgentCount: urgent.length, stagnantCapital, priceRiskCount: priceRiskProducts.length };
};
