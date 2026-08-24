export type ProfitabilitySale = {
  createdAt: string;
  total: number;
  discountAmount?: number;
  items: Array<{ productId: string; name: string; quantity: number; price: number; cost: number }>;
};

export type ProductProfitability = {
  productId: string;
  productName: string;
  units: number;
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  costOfGoods: number;
  profit: number;
  marginPercent: number;
  transactionCount: number;
  soldUnits: number;
  returnedUnits: number;
  returnRatePercent: number;
};

const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

export const getProductProfitability = (sales: ProfitabilitySale[], month?: string) => {
  const groups = new Map<string, ProductProfitability>();
  sales.filter((sale) => !month || sale.createdAt.slice(0, 7) === month).forEach((sale) => {
    const grossSubtotal = sale.items.reduce((total, item) => total + finite(item.quantity) * finite(item.price), 0);
    const saleDiscount = sale.discountAmount === undefined ? grossSubtotal - finite(sale.total) : finite(sale.discountAmount);
    sale.items.forEach((item) => {
      const grossRevenue = finite(item.quantity) * finite(item.price);
      const discount = grossSubtotal === 0 ? 0 : saleDiscount * (grossRevenue / grossSubtotal);
      const netRevenue = grossRevenue - discount;
      const costOfGoods = finite(item.quantity) * finite(item.cost);
      const existing = groups.get(item.productId) ?? { productId: item.productId, productName: item.name, units: 0, grossRevenue: 0, discounts: 0, netRevenue: 0, costOfGoods: 0, profit: 0, marginPercent: 0, transactionCount: 0, soldUnits: 0, returnedUnits: 0, returnRatePercent: 0 };
      const next = {
        ...existing,
        productName: item.name || existing.productName,
        units: existing.units + finite(item.quantity),
        grossRevenue: existing.grossRevenue + grossRevenue,
        discounts: existing.discounts + discount,
        netRevenue: existing.netRevenue + netRevenue,
        costOfGoods: existing.costOfGoods + costOfGoods,
        profit: existing.profit + netRevenue - costOfGoods,
        transactionCount: existing.transactionCount + 1,
        soldUnits: existing.soldUnits + Math.max(0, finite(item.quantity)),
        returnedUnits: existing.returnedUnits + Math.max(0, -finite(item.quantity)),
      };
      groups.set(item.productId, { ...next, marginPercent: next.netRevenue === 0 ? 0 : (next.profit / next.netRevenue) * 100, returnRatePercent: next.soldUnits === 0 ? 0 : (next.returnedUnits / next.soldUnits) * 100 });
    });
  });
  const entries = Array.from(groups.values()).sort((left, right) => right.profit - left.profit || right.netRevenue - left.netRevenue || left.productName.localeCompare(right.productName, "ar"));
  return {
    entries,
    totals: entries.reduce((summary, entry) => ({ units: summary.units + entry.units, grossRevenue: summary.grossRevenue + entry.grossRevenue, discounts: summary.discounts + entry.discounts, netRevenue: summary.netRevenue + entry.netRevenue, costOfGoods: summary.costOfGoods + entry.costOfGoods, profit: summary.profit + entry.profit, soldUnits: summary.soldUnits + entry.soldUnits, returnedUnits: summary.returnedUnits + entry.returnedUnits }), { units: 0, grossRevenue: 0, discounts: 0, netRevenue: 0, costOfGoods: 0, profit: 0, soldUnits: 0, returnedUnits: 0 }),
  };
};
