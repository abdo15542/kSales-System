export type SupplierPurchaseSuggestion = { id: string; name: string; sku: string; quantity: number; suggestedQuantity: number };
export type SupplierPurchaseSuggestionGroup = { supplierName: string; products: SupplierPurchaseSuggestion[] };

export const normalizeSupplierPurchaseOrderQuantity = (value: string | number | undefined, fallback = 1) => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.min(9_999, Math.max(0, parsed)) : Math.min(9_999, Math.max(1, Math.floor(fallback)));
};

export const buildSupplierPurchaseOrderGroups = (groups: SupplierPurchaseSuggestionGroup[], quantities: Record<string, string | number>) => groups.map((group) => ({
  supplierName: group.supplierName,
  products: group.products.map((product) => ({ ...product, requestedQuantity: normalizeSupplierPurchaseOrderQuantity(quantities[product.id], product.suggestedQuantity) })).filter((product) => product.requestedQuantity > 0),
})).filter((group) => group.products.length > 0);

export const getSupplierPurchaseOrderUnits = (groups: ReturnType<typeof buildSupplierPurchaseOrderGroups>) => groups.reduce((total, group) => total + group.products.reduce((groupTotal, product) => groupTotal + product.requestedQuantity, 0), 0);
