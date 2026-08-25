export type PriceLookupProduct = {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  quantity: number;
  category: string;
  barcodeAliases?: string[];
};

export type PriceLookupEntry = {
  id: string;
  query: string;
  productId: string;
  productName: string;
  found: boolean;
  lookedUpAt: string;
};

export const PRICE_LOOKUP_HISTORY_LIMIT = 8;

const normalizeBarcode = (value: string) => value.trim().replace(/[\s-]+/g, "").toLocaleLowerCase("ar");
const normalizeText = (value: string) => value.trim().toLocaleLowerCase("ar");

export function findPriceLookupProduct<T extends PriceLookupProduct>(products: T[], value: string): T | undefined {
  const text = normalizeText(value);
  const barcode = normalizeBarcode(value);
  if (!text) return undefined;

  const exactBarcodeMatch = products.find((product) => [product.sku, ...(product.barcodeAliases ?? [])].some((code) => normalizeBarcode(code) === barcode));
  if (exactBarcodeMatch) return exactBarcodeMatch;

  return products.find((product) => {
    const searchable = [product.name, product.sku, ...(product.barcodeAliases ?? [])].map(normalizeText);
    return searchable.some((candidate) => candidate.includes(text));
  });
}

export function appendPriceLookupHistory(current: PriceLookupEntry[], next: PriceLookupEntry): PriceLookupEntry[] {
  const withoutDuplicate = current.filter((entry) => entry.productId !== next.productId || entry.found !== next.found || entry.query !== next.query);
  return [next, ...withoutDuplicate].slice(0, PRICE_LOOKUP_HISTORY_LIMIT);
}
