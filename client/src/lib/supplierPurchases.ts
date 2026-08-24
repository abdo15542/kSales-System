import type { ProductBatch } from "./productBatches";

export type SupplierPurchaseProduct = {
  id: string;
  name: string;
  sku: string;
  batches?: ProductBatch[];
};

export type SupplierPurchaseEntry = {
  supplierName: string;
  productName: string;
  sku: string;
  batchId: string;
  date: string;
  type: "استلام" | "إرجاع";
  quantity: number;
  amount: number;
};

export type SupplierPurchaseGroup = {
  supplierName: string;
  received: number;
  returned: number;
  net: number;
  receivedUnits: number;
  returnedUnits: number;
  entryCount: number;
  entries: SupplierPurchaseEntry[];
};

export type SupplierPurchaseReport = {
  fromDate: string;
  toDate: string;
  received: number;
  returned: number;
  net: number;
  groups: SupplierPurchaseGroup[];
};

const toDateKey = (timestamp: string) => timestamp.slice(0, 10);
const inRange = (date: string, fromDate: string, toDate: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= fromDate && date <= toDate;
const safeAmount = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;
const safeQuantity = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;

export function getSupplierPurchaseReport(products: SupplierPurchaseProduct[], fromDate: string, toDate: string): SupplierPurchaseReport {
  const entries = products.flatMap((product) => (product.batches ?? []).flatMap((batch) => {
    const supplierName = batch.supplierName.trim() || "بدون مورد";
    const receivedDate = toDateKey(batch.receivedAt);
    const received = inRange(receivedDate, fromDate, toDate) ? [{
      supplierName,
      productName: product.name,
      sku: product.sku,
      batchId: batch.id,
      date: receivedDate,
      type: "استلام" as const,
      quantity: safeQuantity(batch.quantity),
      amount: safeQuantity(batch.quantity) * Math.max(0, Number(batch.purchasePrice) || 0),
    }] : [];
    const returnedDate = batch.supplierReturn ? toDateKey(batch.supplierReturn.returnedAt) : "";
    const returned = batch.supplierReturn && inRange(returnedDate, fromDate, toDate) ? [{
      supplierName,
      productName: product.name,
      sku: product.sku,
      batchId: batch.id,
      date: returnedDate,
      type: "إرجاع" as const,
      quantity: safeQuantity(batch.supplierReturn.quantity),
      amount: safeAmount(batch.supplierReturn.cost),
    }] : [];
    return [...received, ...returned];
  }));
  const grouped = new Map<string, SupplierPurchaseEntry[]>();
  entries.forEach((entry) => grouped.set(entry.supplierName, [...(grouped.get(entry.supplierName) ?? []), entry]));
  const groups = Array.from(grouped.entries()).map(([supplierName, supplierEntries]) => {
    const receivedEntries = supplierEntries.filter((entry) => entry.type === "استلام");
    const returnedEntries = supplierEntries.filter((entry) => entry.type === "إرجاع");
    const received = receivedEntries.reduce((total, entry) => total + entry.amount, 0);
    const returned = returnedEntries.reduce((total, entry) => total + entry.amount, 0);
    return {
      supplierName,
      received,
      returned,
      net: received - returned,
      receivedUnits: receivedEntries.reduce((total, entry) => total + entry.quantity, 0),
      returnedUnits: returnedEntries.reduce((total, entry) => total + entry.quantity, 0),
      entryCount: supplierEntries.length,
      entries: supplierEntries.sort((left, right) => right.date.localeCompare(left.date) || right.type.localeCompare(left.type)),
    };
  }).sort((left, right) => right.net - left.net || left.supplierName.localeCompare(right.supplierName, "ar"));
  return {
    fromDate,
    toDate,
    received: groups.reduce((total, group) => total + group.received, 0),
    returned: groups.reduce((total, group) => total + group.returned, 0),
    net: groups.reduce((total, group) => total + group.net, 0),
    groups,
  };
}

type SupplierCreditGroup = { supplierName: string; outstanding: number };
type SupplierDueDateStatus = { supplierName: string; dueDate: string; overdue: boolean; nearing: boolean };

export type SupplierObligationStatus = "settled" | "payable" | "nearDue" | "overdue";

export type SupplierObligation = {
  supplierName: string;
  outstanding: number;
  dueDate?: string;
  status: SupplierObligationStatus;
};

export function getSupplierObligationReport(groups: SupplierCreditGroup[], dueDates: SupplierDueDateStatus[]) {
  const dueBySupplier = new Map(dueDates.map((entry) => [entry.supplierName, entry]));
  const obligations = groups.map((group) => {
    const outstanding = Math.max(0, Number(group.outstanding) || 0);
    const due = dueBySupplier.get(group.supplierName);
    const status: SupplierObligationStatus = outstanding <= 0 ? "settled" : due?.overdue ? "overdue" : due?.nearing ? "nearDue" : "payable";
    return { supplierName: group.supplierName, outstanding, dueDate: due?.dueDate, status };
  }).sort((left, right) => right.outstanding - left.outstanding || left.supplierName.localeCompare(right.supplierName, "ar"));
  return {
    obligations,
    settledCount: obligations.filter((entry) => entry.status === "settled").length,
    payableCount: obligations.filter((entry) => entry.status === "payable").length,
    nearDueCount: obligations.filter((entry) => entry.status === "nearDue").length,
    overdueCount: obligations.filter((entry) => entry.status === "overdue").length,
  };
}
