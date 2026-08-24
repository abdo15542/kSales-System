export type BarcodeStocktakeProduct = {
  id: string;
  quantity: number;
  purchasePrice: number;
};

export type BarcodeStocktakeDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  note: string;
  counts: Record<string, number>;
};

const wholeQuantity = (value: unknown) => Number.isFinite(value) ? Math.max(0, Math.floor(Number(value))) : 0;

export const normaliseBarcodeStocktakeCounts = (value: unknown, productIds: Iterable<string>): Record<string, number> => {
  if (!value || typeof value !== "object") return {};
  const allowedIds = new Set(productIds);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([productId, quantity]) => {
    if (!allowedIds.has(productId) || !Number.isFinite(quantity) || Number(quantity) < 0) return [];
    return [[productId, wholeQuantity(quantity)]];
  }));
};

export const createBarcodeStocktakeDraft = (id: string, createdAt: string, note = "جرد سريع بالباركود"): BarcodeStocktakeDraft => ({
  id,
  createdAt,
  updatedAt: createdAt,
  note: note.trim().slice(0, 160) || "جرد سريع بالباركود",
  counts: {},
});

export const incrementBarcodeStocktakeCount = (counts: Record<string, number>, productId: string) => ({
  ...counts,
  [productId]: wholeQuantity(counts[productId]) + 1,
});

export const getBarcodeStocktakeProgress = <T extends BarcodeStocktakeProduct>(products: T[], counts: Record<string, number>) => {
  const countedProducts = products.filter((product) => Object.prototype.hasOwnProperty.call(counts, product.id));
  const entries = products.map((product) => {
    const counted = Object.prototype.hasOwnProperty.call(counts, product.id);
    const actualQuantity = counted ? wholeQuantity(counts[product.id]) : null;
    const difference = actualQuantity === null ? null : actualQuantity - wholeQuantity(product.quantity);
    return { ...product, counted, actualQuantity, difference, valueDifference: difference === null ? null : difference * Math.max(0, Number(product.purchasePrice) || 0) };
  });
  const completed = countedProducts.length === products.length && products.length > 0;
  return {
    entries,
    countedProducts: countedProducts.length,
    uncountedProducts: Math.max(0, products.length - countedProducts.length),
    scannedUnits: countedProducts.reduce((total, product) => total + wholeQuantity(counts[product.id]), 0),
    differences: entries.filter((entry) => entry.difference !== null && entry.difference !== 0).length,
    completed,
  };
};
