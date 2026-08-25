export type MonthlyProduct = { id: string; name: string; sku: string; category: string; quantity: number; purchasePrice: number; salePrice: number };
export type MonthlySale = { id: string; createdAt: string; total: number; profit: number; paymentMethod: "cash" | "card" | "transfer" | "credit"; customerName?: string; items: Array<{ productId: string; name: string; quantity: number; price: number; cost: number }> };

export const getInactiveProducts = (products: MonthlyProduct[], sales: MonthlySale[], now = new Date(), days = 30) => {
  if (!sales.length) return [];
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  return products.filter((product) => product.quantity > 0).flatMap((product) => {
    const lastSale = sales.filter((sale) => sale.items.some((item) => item.productId === product.id)).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
    if (lastSale && new Date(lastSale.createdAt) >= cutoff) return [];
    return [{ product, lastSoldAt: lastSale?.createdAt ?? "" }];
  });
};

export const getMonthlyReport = (sales: MonthlySale[], now = new Date()) => {
  const startAt = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentSales = sales.filter((sale) => {
    const issuedAt = new Date(sale.createdAt);
    return issuedAt >= startAt && issuedAt <= now;
  });
  const revenue = currentSales.reduce((total, sale) => total + sale.total, 0);
  const profit = currentSales.reduce((total, sale) => total + sale.profit, 0);
  const productMap = new Map<string, { productId: string; name: string; quantity: number; revenue: number; profit: number }>();
  currentSales.forEach((sale) => sale.items.forEach((item) => {
    const existing = productMap.get(item.productId) ?? { productId: item.productId, name: item.name, quantity: 0, revenue: 0, profit: 0 };
    productMap.set(item.productId, { ...existing, quantity: existing.quantity + item.quantity, revenue: existing.revenue + item.quantity * item.price, profit: existing.profit + item.quantity * (item.price - item.cost) });
  }));
  return {
    startAt: startAt.toISOString(),
    endAt: now.toISOString(),
    invoices: currentSales.length,
    revenue,
    profit,
    units: Array.from(productMap.values()).reduce((total, product) => total + product.quantity, 0),
    averageInvoice: currentSales.length ? revenue / currentSales.length : 0,
    sales: currentSales,
    products: Array.from(productMap.values()).sort((left, right) => right.revenue - left.revenue),
  };
};
