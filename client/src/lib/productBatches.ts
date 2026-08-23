export type ProductBatch = {
  id: string;
  receivedAt: string;
  quantity: number;
  remainingQuantity: number;
  purchasePrice: number;
  expiryDate: string;
  supplierName: string;
  note: string;
};

export type BatchProduct = { id: string; name: string; sku: string; batches?: ProductBatch[] };

const expirySortValue = (expiryDate: string) => /^\d{4}-\d{2}-\d{2}$/.test(expiryDate) ? expiryDate : "9999-12-31";

export const getActiveBatches = (batches: ProductBatch[]) => batches.filter((batch) => batch.remainingQuantity > 0).sort((left, right) => expirySortValue(left.expiryDate).localeCompare(expirySortValue(right.expiryDate)) || new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime());

export const getBatchRemainingTotal = (batches: ProductBatch[]) => batches.reduce((total, batch) => total + Math.max(0, batch.remainingQuantity), 0);

export const consumeBatchesFefo = (batches: ProductBatch[], quantity: number) => {
  let outstanding = Math.max(0, quantity);
  const consumedBatchIds: string[] = [];
  const byId = new Map(batches.map((batch) => [batch.id, { ...batch }]));
  getActiveBatches(batches).forEach((batch) => {
    if (!outstanding) return;
    const next = byId.get(batch.id);
    if (!next) return;
    const used = Math.min(next.remainingQuantity, outstanding);
    if (used > 0) consumedBatchIds.push(next.id);
    next.remainingQuantity -= used;
    outstanding -= used;
  });
  return { batches: batches.map((batch) => byId.get(batch.id) ?? batch), consumedBatchIds, missingQuantity: outstanding };
};

export const getEarliestActiveExpiry = (batches: ProductBatch[]) => getActiveBatches(batches).find((batch) => batch.expiryDate)?.expiryDate ?? "";

export const getExpirySortedBatchInventory = (products: BatchProduct[]) => products.flatMap((product) => getActiveBatches(product.batches ?? []).map((batch) => ({ product, batch }))).sort((left, right) => expirySortValue(left.batch.expiryDate).localeCompare(expirySortValue(right.batch.expiryDate)) || left.product.name.localeCompare(right.product.name, "ar"));

export const getBatchHistory = (products: BatchProduct[]) => products.flatMap((product) => (product.batches ?? []).map((batch) => ({ product, batch }))).sort((left, right) => {
  const activeDifference = Number(right.batch.remainingQuantity > 0) - Number(left.batch.remainingQuantity > 0);
  if (activeDifference) return activeDifference;
  return expirySortValue(left.batch.expiryDate).localeCompare(expirySortValue(right.batch.expiryDate)) || new Date(right.batch.receivedAt).getTime() - new Date(left.batch.receivedAt).getTime();
});

export const reconcileBatchStocktake = (batches: ProductBatch[], actualQuantity: number, receivedAt: string, purchasePrice: number) => {
  const currentQuantity = getBatchRemainingTotal(batches);
  if (actualQuantity <= currentQuantity) return consumeBatchesFefo(batches, currentQuantity - actualQuantity).batches;
  const adjustment = actualQuantity - currentQuantity;
  return [...batches, { id: `stocktake-${receivedAt}`, receivedAt, quantity: adjustment, remainingQuantity: adjustment, purchasePrice, expiryDate: "", supplierName: "تسوية جرد", note: "زيادة مثبتة عند الجرد" }];
};
