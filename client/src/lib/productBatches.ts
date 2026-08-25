export type ProductBatch = {
  id: string;
  receivedAt: string;
  quantity: number;
  remainingQuantity: number;
  purchasePrice: number;
  expiryDate: string;
  supplierName: string;
  purchaseInvoiceRef?: string;
  note: string;
  staffMemberId?: string;
  staffMemberName?: string;
  wasteRequest?: { requestedAt: string; reason: string; quantity: number; cost: number };
  wasteApproval?: { approvedAt: string; reason: string; quantity: number; cost: number };
  supplierReturn?: { returnedAt: string; reason: string; quantity: number; cost: number };
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

export const getExpirySortedBatchInventory = <T extends BatchProduct>(products: T[]) => products.flatMap((product) => getActiveBatches(product.batches ?? []).map((batch) => ({ product, batch }))).sort((left, right) => expirySortValue(left.batch.expiryDate).localeCompare(expirySortValue(right.batch.expiryDate)) || left.product.name.localeCompare(right.product.name, "ar"));

export const getBatchHistory = <T extends BatchProduct>(products: T[]) => products.flatMap((product) => (product.batches ?? []).map((batch) => ({ product, batch }))).sort((left, right) => {
  const activeDifference = Number(right.batch.remainingQuantity > 0) - Number(left.batch.remainingQuantity > 0);
  if (activeDifference) return activeDifference;
  return expirySortValue(left.batch.expiryDate).localeCompare(expirySortValue(right.batch.expiryDate)) || new Date(right.batch.receivedAt).getTime() - new Date(left.batch.receivedAt).getTime();
});

export const isBatchEditable = (batch: ProductBatch) => batch.quantity > 0 && batch.remainingQuantity === batch.quantity;

export const updateUnconsumedBatch = (batches: ProductBatch[], batchId: string, changes: Pick<ProductBatch, "quantity" | "purchasePrice" | "expiryDate" | "supplierName" | "note"> & { purchaseInvoiceRef?: string }) => {
  const current = batches.find((batch) => batch.id === batchId);
  if (!current || !isBatchEditable(current) || changes.quantity <= 0 || changes.purchasePrice < 0) return { batches, changed: false };
  return { batches: batches.map((batch) => batch.id === batchId ? { ...batch, ...changes, remainingQuantity: changes.quantity } : batch), changed: true };
};

export const cancelUnconsumedBatch = (batches: ProductBatch[], batchId: string) => {
  const current = batches.find((batch) => batch.id === batchId);
  if (!current || !isBatchEditable(current)) return { batches, cancelled: undefined };
  return { batches: batches.filter((batch) => batch.id !== batchId), cancelled: current };
};

export const getExpiryWasteReport = (products: BatchProduct[], now = new Date()) => {
  const nowTime = now.getTime();
  const entries = products.flatMap((product) => (product.batches ?? []).flatMap((batch) => {
    if (!batch.remainingQuantity || !/^\d{4}-\d{2}-\d{2}$/.test(batch.expiryDate)) return [];
    const expiryTime = new Date(`${batch.expiryDate}T23:59:59`).getTime();
    return Number.isFinite(expiryTime) && expiryTime < nowTime ? [{ product, batch, cost: batch.remainingQuantity * batch.purchasePrice }] : [];
  })).sort((left, right) => left.batch.expiryDate.localeCompare(right.batch.expiryDate));
  return { entries, units: entries.reduce((total, entry) => total + entry.batch.remainingQuantity, 0), cost: entries.reduce((total, entry) => total + entry.cost, 0) };
};

export const requestExpiredBatchWaste = (batches: ProductBatch[], batchId: string, reason: string, requestedAt: string) => {
  const current = batches.find((batch) => batch.id === batchId);
  const expiryTime = current?.expiryDate ? new Date(`${current.expiryDate}T23:59:59`).getTime() : Number.NaN;
  const requestTime = new Date(requestedAt).getTime();
  if (!current || !current.remainingQuantity || current.wasteRequest || current.wasteApproval || current.supplierReturn || !reason.trim() || !Number.isFinite(expiryTime) || !Number.isFinite(requestTime) || expiryTime >= requestTime) return { batches, requested: undefined };
  const request = { requestedAt, reason: reason.trim(), quantity: current.remainingQuantity, cost: current.remainingQuantity * current.purchasePrice };
  return { batches: batches.map((batch) => batch.id === batchId ? { ...batch, wasteRequest: request } : batch), requested: request };
};

export const approveRequestedBatchWaste = (batches: ProductBatch[], batchId: string, confirmation: string, approvedAt: string) => {
  const current = batches.find((batch) => batch.id === batchId);
  if (!current || !current.wasteRequest || current.wasteApproval || current.supplierReturn || !current.remainingQuantity || confirmation.trim() !== "اعتماد نهائي") return { batches, approved: undefined };
  const approval = { approvedAt, reason: current.wasteRequest.reason, quantity: current.wasteRequest.quantity, cost: current.wasteRequest.cost };
  return { batches: batches.map((batch) => batch.id === batchId ? { ...batch, remainingQuantity: 0, wasteApproval: approval } : batch), approved: approval };
};

export const returnUnconsumedBatchToSupplier = (batches: ProductBatch[], batchId: string, reason: string, returnedAt: string) => {
  const current = batches.find((batch) => batch.id === batchId);
  if (!current || !isBatchEditable(current) || current.wasteApproval || current.supplierReturn || !reason.trim()) return { batches, returned: undefined };
  const returned = { returnedAt, reason: reason.trim(), quantity: current.quantity, cost: current.quantity * current.purchasePrice };
  return { batches: batches.map((batch) => batch.id === batchId ? { ...batch, remainingQuantity: 0, supplierReturn: returned } : batch), returned };
};

export const getSupplierInventoryCostReport = <T extends BatchProduct>(products: T[]) => {
  const totals = new Map<string, { supplierName: string; units: number; cost: number; batchCount: number; products: Array<{ product: T; batch: ProductBatch; cost: number }> }>();
  products.forEach((product) => (product.batches ?? []).forEach((batch) => {
    if (!batch.remainingQuantity || batch.wasteApproval || batch.supplierReturn) return;
    const supplierName = batch.supplierName.trim() || "بدون مورد";
    const current = totals.get(supplierName) ?? { supplierName, units: 0, cost: 0, batchCount: 0, products: [] };
    const cost = batch.remainingQuantity * batch.purchasePrice;
    current.units += batch.remainingQuantity;
    current.cost += cost;
    current.batchCount += 1;
    current.products.push({ product, batch, cost });
    totals.set(supplierName, current);
  }));
  const groups = Array.from(totals.values()).sort((left, right) => right.cost - left.cost || left.supplierName.localeCompare(right.supplierName, "ar"));
  return { groups, units: groups.reduce((total, group) => total + group.units, 0), cost: groups.reduce((total, group) => total + group.cost, 0) };
};

export const getSupplierCreditStatusReport = <T extends BatchProduct>(products: T[], limits: Record<string, number>) => {
  const inventory = getSupplierInventoryCostReport(products);
  const groups = inventory.groups.map((group) => {
    const creditLimit = Math.max(0, Number(limits[group.supplierName]) || 0);
    const exceeded = creditLimit > 0 && group.cost > creditLimit;
    return { ...group, creditLimit, availableCredit: creditLimit > 0 ? Math.max(0, creditLimit - group.cost) : 0, exceeded };
  });
  return { groups, exceededCount: groups.filter((group) => group.exceeded).length };
};

export const reconcileBatchStocktake = (batches: ProductBatch[], actualQuantity: number, receivedAt: string, purchasePrice: number) => {
  const currentQuantity = getBatchRemainingTotal(batches);
  if (actualQuantity <= currentQuantity) return consumeBatchesFefo(batches, currentQuantity - actualQuantity).batches;
  const adjustment = actualQuantity - currentQuantity;
  return [...batches, { id: `stocktake-${receivedAt}`, receivedAt, quantity: adjustment, remainingQuantity: adjustment, purchasePrice, expiryDate: "", supplierName: "تسوية جرد", note: "زيادة مثبتة عند الجرد" }];
};
