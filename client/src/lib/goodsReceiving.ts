export type BarcodeProduct = { id: string; sku: string };

export const findProductByBarcode = <Product extends BarcodeProduct>(products: Product[], barcode: string) => {
  const normalized = barcode.trim().toLocaleLowerCase("ar");
  if (!normalized) return undefined;
  return products.find((product) => product.sku.trim().toLocaleLowerCase("ar") === normalized);
};

export const clampReceivingQuantity = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
