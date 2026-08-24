type ReturnCartSale = {
  discountAmount?: number;
  items: Array<{ productId: string; quantity: number; price: number; cost: number; name: string }>;
};

export const clampReturnCartQuantity = (currentQuantity: number, change: number, remainingQuantity: number) => Math.min(Math.max(0, Math.floor(remainingQuantity)), Math.max(0, Math.floor(currentQuantity) + Math.floor(change)));

export const getReturnCartTotal = (sale: ReturnCartSale, items: ReturnCartSale["items"]) => {
  const originalGross = sale.items.reduce((total, item) => total + item.quantity * item.price, 0);
  const returnedGross = items.reduce((total, item) => total + item.quantity * item.price, 0);
  const allocatedDiscount = originalGross > 0 ? Math.max(0, (sale.discountAmount ?? 0) * (returnedGross / originalGross)) : 0;
  return Math.max(0, returnedGross - allocatedDiscount);
};
