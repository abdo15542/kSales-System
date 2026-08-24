export type CategorySaleItem = { productId: string; name: string; quantity: number; price: number; cost: number; category?: string };
export type CategorySale = { isReturn?: boolean; discountAmount?: number; items: CategorySaleItem[] };

export type CategorySalesRow = { category: string; soldUnits: number; returnedUnits: number; netUnits: number; revenue: number; cost: number; profit: number };

export const getCategorySalesReport = (sales: CategorySale[], currentProducts: Array<{ id: string; category?: string }>) => {
  const categoriesByProduct = new Map(currentProducts.map((product) => [product.id, product.category?.trim() || "غير مصنف"]));
  const aggregate = new Map<string, CategorySalesRow>();
  sales.forEach((sale) => {
    const saleGross = sale.items.reduce((total, item) => total + item.price * item.quantity, 0);
    sale.items.forEach((item) => {
      const category = item.category?.trim() || categoriesByProduct.get(item.productId) || "غير مصنف";
      const current = aggregate.get(category) ?? { category, soldUnits: 0, returnedUnits: 0, netUnits: 0, revenue: 0, cost: 0, profit: 0 };
      const gross = item.price * item.quantity;
      const discount = sale.isReturn || saleGross <= 0 ? 0 : (sale.discountAmount || 0) * (gross / saleGross);
      const sign = sale.isReturn ? -1 : 1;
      const netRevenue = sign * gross - discount;
      const netCost = sign * item.cost * item.quantity;
      current.soldUnits += sale.isReturn ? 0 : item.quantity;
      current.returnedUnits += sale.isReturn ? item.quantity : 0;
      current.netUnits += sign * item.quantity;
      current.revenue += netRevenue;
      current.cost += netCost;
      current.profit += netRevenue - netCost;
      aggregate.set(category, current);
    });
  });
  const entries = Array.from(aggregate.values()).sort((left, right) => right.revenue - left.revenue || left.category.localeCompare(right.category, "ar"));
  const totals = entries.reduce((total, entry) => ({ soldUnits: total.soldUnits + entry.soldUnits, returnedUnits: total.returnedUnits + entry.returnedUnits, netUnits: total.netUnits + entry.netUnits, revenue: total.revenue + entry.revenue, cost: total.cost + entry.cost, profit: total.profit + entry.profit }), { soldUnits: 0, returnedUnits: 0, netUnits: 0, revenue: 0, cost: 0, profit: 0 });
  return { entries, totals };
};
