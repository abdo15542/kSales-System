export type MarginProtectedCartItem = {
  id: string;
  name: string;
  cartQuantity: number;
  salePrice: number;
  purchasePrice: number;
  minimumMarginPercent?: number;
};

export type MarginViolation = {
  productId: string;
  productName: string;
  minimumMarginPercent: number;
  actualMarginPercent: number;
};

export const getMinimumMarginViolations = (items: MarginProtectedCartItem[], totalDiscountAmount: number): MarginViolation[] => {
  const grossTotal = items.reduce((total, item) => total + item.salePrice * item.cartQuantity, 0);
  return items.flatMap((item) => {
    const minimumMarginPercent = Math.min(100, Math.max(0, Number(item.minimumMarginPercent) || 0));
    if (!minimumMarginPercent || grossTotal <= 0) return [];
    const grossRevenue = item.salePrice * item.cartQuantity;
    const allocatedDiscount = totalDiscountAmount * (grossRevenue / grossTotal);
    const netRevenue = grossRevenue - allocatedDiscount;
    const cost = item.purchasePrice * item.cartQuantity;
    const actualMarginPercent = netRevenue > 0 ? ((netRevenue - cost) / netRevenue) * 100 : -100;
    return actualMarginPercent + 0.00001 < minimumMarginPercent ? [{ productId: item.id, productName: item.name, minimumMarginPercent, actualMarginPercent }] : [];
  });
};
