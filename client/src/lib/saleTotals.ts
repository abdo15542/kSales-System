export type SaleTotals = {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  profit: number;
};

export function calculateSaleTotals(subtotal: number, costTotal: number, requestedDiscountPercent: number): SaleTotals {
  const safeSubtotal = Math.max(0, subtotal);
  const safeCostTotal = Math.max(0, costTotal);
  const discountPercent = Math.min(100, Math.max(0, Number(requestedDiscountPercent) || 0));
  const discountAmount = Math.round(safeSubtotal * discountPercent) / 100;
  return {
    subtotal: safeSubtotal,
    discountPercent,
    discountAmount,
    total: Math.max(0, safeSubtotal - discountAmount),
    profit: safeSubtotal - safeCostTotal - discountAmount,
  };
}
