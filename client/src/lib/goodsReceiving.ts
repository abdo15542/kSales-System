export type BarcodeProduct = { id: string; sku: string; barcodeAliases?: string[] };

const normalizeBarcode = (value: string) => value.trim().toLocaleLowerCase("ar");
const compactBarcode = (value: string) => normalizeBarcode(value).replace(/[\s_-]/g, "");

const productBarcodes = (product: BarcodeProduct) => [product.sku, ...(Array.isArray(product.barcodeAliases) ? product.barcodeAliases : [])];

export const findProductByBarcode = <Product extends BarcodeProduct>(products: Product[], barcode: string) => {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return undefined;
  const exactProduct = products.find((product) => productBarcodes(product).some((value) => normalizeBarcode(value) === normalized));
  if (exactProduct) return exactProduct;
  const compact = compactBarcode(barcode);
  if (!compact) return undefined;
  const candidates = products.filter((product) => productBarcodes(product).some((value) => compactBarcode(value) === compact));
  return candidates.length === 1 ? candidates[0] : undefined;
};

export const appendBarcodeAlias = (aliases: string[] | undefined, barcode: string, limit = 8) => {
  const value = barcode.trim().slice(0, 120);
  if (!value) return Array.isArray(aliases) ? aliases : [];
  return [value, ...(aliases ?? []).filter((entry) => normalizeBarcode(entry) !== normalizeBarcode(value))].slice(0, Math.max(1, limit));
};

export const clampReceivingQuantity = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
