export type CostChangeReceipt = {
  id: string;
  productId: string;
  productName: string;
  supplierName: string;
  purchasePrice: number;
  receivedAt: string;
};

export type SupplierCostChange = {
  receiptId: string;
  supplierName: string;
  productName: string;
  receivedAt: string;
  previousCost: number;
  nextCost: number;
  difference: number;
  percentChange: number | null;
};

export const getSupplierCostChanges = (receipts: CostChangeReceipt[], monthKey: string) => {
  const previousCostByProduct = new Map<string, number>();
  const changes: SupplierCostChange[] = [];
  [...receipts]
    .filter((receipt) => Number.isFinite(receipt.purchasePrice) && receipt.purchasePrice >= 0 && /^\d{4}-\d{2}/.test(receipt.receivedAt))
    .sort((left, right) => left.receivedAt.localeCompare(right.receivedAt) || left.id.localeCompare(right.id))
    .forEach((receipt) => {
      const previousCost = previousCostByProduct.get(receipt.productId);
      if (receipt.receivedAt.slice(0, 7) === monthKey && previousCost !== undefined && previousCost !== receipt.purchasePrice) {
        const difference = receipt.purchasePrice - previousCost;
        changes.push({
          receiptId: receipt.id,
          supplierName: receipt.supplierName || "غير محدد",
          productName: receipt.productName,
          receivedAt: receipt.receivedAt,
          previousCost,
          nextCost: receipt.purchasePrice,
          difference,
          percentChange: previousCost > 0 ? (difference / previousCost) * 100 : null,
        });
      }
      previousCostByProduct.set(receipt.productId, receipt.purchasePrice);
    });
  const suppliers = Array.from(new Set(changes.map((change) => change.supplierName))).map((supplierName) => {
    const supplierChanges = changes.filter((change) => change.supplierName === supplierName);
    return {
      supplierName,
      changes: supplierChanges,
      increases: supplierChanges.filter((change) => change.difference > 0).length,
      decreases: supplierChanges.filter((change) => change.difference < 0).length,
    };
  }).sort((left, right) => right.changes.length - left.changes.length || left.supplierName.localeCompare(right.supplierName, "ar"));
  return { changes: changes.sort((left, right) => right.receivedAt.localeCompare(left.receivedAt)), suppliers };
};
