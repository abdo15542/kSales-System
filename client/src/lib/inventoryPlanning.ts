export type InventoryPlanningProduct = {
  id: string;
  name: string;
  sku: string;
  supplierName?: string;
  expiryDate?: string;
  quantity: number;
  lowStockAt: number;
};

export type ExpiryStatus = { kind: "unset" | "valid" | "soon" | "expired"; daysRemaining?: number };

export const getExpiryStatus = (expiryDate: string | undefined, now = new Date(), warningDays = 30): ExpiryStatus => {
  if (!expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) return { kind: "unset" };
  const endOfExpiryDay = new Date(`${expiryDate}T23:59:59`);
  if (Number.isNaN(endOfExpiryDay.getTime())) return { kind: "unset" };
  const daysRemaining = Math.ceil((endOfExpiryDay.getTime() - now.getTime()) / 86_400_000);
  if (daysRemaining < 0) return { kind: "expired", daysRemaining };
  if (daysRemaining <= warningDays) return { kind: "soon", daysRemaining };
  return { kind: "valid", daysRemaining };
};

export const getExpiringProducts = (products: InventoryPlanningProduct[], now = new Date(), warningDays = 30) => products.flatMap((product) => {
  const status = getExpiryStatus(product.expiryDate, now, warningDays);
  return status.kind === "soon" || status.kind === "expired" ? [{ product, status }] : [];
});

export const getSupplierPurchaseList = (products: InventoryPlanningProduct[]) => {
  const groups = new Map<string, Array<InventoryPlanningProduct & { suggestedQuantity: number }>>();
  products.filter((product) => product.quantity <= product.lowStockAt).forEach((product) => {
    const supplierName = product.supplierName?.trim() || "بدون مورد محدد";
    const entries = groups.get(supplierName) ?? [];
    entries.push({ ...product, suggestedQuantity: Math.max(1, product.lowStockAt * 2 - product.quantity) });
    groups.set(supplierName, entries);
  });
  return Array.from(groups.entries()).map(([supplierName, products]) => ({ supplierName, products })).sort((left, right) => left.supplierName.localeCompare(right.supplierName, "ar"));
};
