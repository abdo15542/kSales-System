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
  productId: string;
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
          productId: receipt.productId,
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

export const getRepeatedCostIncreaseProducts = (changes: SupplierCostChange[], minimumIncreases = 2) => {
  const grouped = new Map<string, SupplierCostChange[]>();
  changes.filter((change) => change.difference > 0).forEach((change) => {
    const entries = grouped.get(change.productId) ?? [];
    entries.push(change);
    grouped.set(change.productId, entries);
  });
  return Array.from(grouped.values()).filter((entries) => entries.length >= minimumIncreases).map((entries) => ({
    productId: entries[0].productId,
    productName: entries[0].productName,
    increases: entries.length,
    suppliers: Array.from(new Set(entries.map((entry) => entry.supplierName))),
    totalIncrease: entries.reduce((total, entry) => total + entry.difference, 0),
    latestReceivedAt: [...entries].sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))[0].receivedAt,
  })).sort((left, right) => right.increases - left.increases || right.totalIncrease - left.totalIncrease || left.productName.localeCompare(right.productName, "ar"));
};

export const getPreviousMonthKey = (monthKey: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
};

export const getSupplierMonthlyCostComparison = (receipts: CostChangeReceipt[], monthKey: string) => {
  const previousMonthKey = getPreviousMonthKey(monthKey);
  const current = getSupplierCostChanges(receipts, monthKey).suppliers;
  const previous = previousMonthKey ? getSupplierCostChanges(receipts, previousMonthKey).suppliers : [];
  const names = Array.from(new Set([...current, ...previous].map((supplier) => supplier.supplierName)));
  return {
    currentMonthKey: monthKey,
    previousMonthKey,
    suppliers: names.map((supplierName) => {
      const currentSupplier = current.find((supplier) => supplier.supplierName === supplierName);
      const previousSupplier = previous.find((supplier) => supplier.supplierName === supplierName);
      const currentChanges = currentSupplier?.changes ?? [];
      const previousChanges = previousSupplier?.changes ?? [];
      const currentNetChange = currentChanges.reduce((total, change) => total + change.difference, 0);
      const previousNetChange = previousChanges.reduce((total, change) => total + change.difference, 0);
      const currentIncreases = currentSupplier?.increases ?? 0;
      const previousIncreases = previousSupplier?.increases ?? 0;
      return { supplierName, currentChanges: currentChanges.length, previousChanges: previousChanges.length, changesDifference: currentChanges.length - previousChanges.length, currentIncreases, previousIncreases, increasesDifference: currentIncreases - previousIncreases, currentNetChange, previousNetChange, netChangeDifference: currentNetChange - previousNetChange };
    }).sort((left, right) => right.currentChanges - left.currentChanges || right.currentIncreases - left.currentIncreases || left.supplierName.localeCompare(right.supplierName, "ar")),
  };
};
