export type CategorizedInventoryProduct = {
  id: string;
  category?: string;
  quantity: number;
  lowStockAt: number;
  purchasePrice: number;
  salePrice: number;
};

export type InventoryCategorySummary = {
  category: string;
  productCount: number;
  units: number;
  purchaseValue: number;
  saleValue: number;
  lowStockCount: number;
};

export const getInventoryCategorySummary = (products: CategorizedInventoryProduct[]) => {
  const groups = new Map<string, InventoryCategorySummary>();
  products.forEach((product) => {
    const category = product.category?.trim() || "غير مصنف";
    const group = groups.get(category) ?? { category, productCount: 0, units: 0, purchaseValue: 0, saleValue: 0, lowStockCount: 0 };
    const quantity = Math.max(0, Number(product.quantity) || 0);
    group.productCount += 1;
    group.units += quantity;
    group.purchaseValue += quantity * Math.max(0, Number(product.purchasePrice) || 0);
    group.saleValue += quantity * Math.max(0, Number(product.salePrice) || 0);
    if (quantity <= Math.max(0, Number(product.lowStockAt) || 0)) group.lowStockCount += 1;
    groups.set(category, group);
  });
  return Array.from(groups.values()).sort((left, right) => right.purchaseValue - left.purchaseValue || left.category.localeCompare(right.category, "ar"));
};
