export type RepeatSaleProduct = { id: string; quantity: number };
export type RepeatSaleSource = { items: Array<{ productId: string; quantity: number }> };

export const rebuildRepeatSaleCart = <Product extends RepeatSaleProduct>(products: Product[], source: RepeatSaleSource) => {
  let skipped = 0;
  const items = source.items.flatMap((saleItem) => {
    const product = products.find((entry) => entry.id === saleItem.productId);
    if (!product || product.quantity <= 0) {
      skipped += 1;
      return [];
    }
    return [{ ...product, cartQuantity: Math.min(product.quantity, saleItem.quantity) }];
  });
  return { items, skipped };
};
