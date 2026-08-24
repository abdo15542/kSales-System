import type { BatchProduct, ProductBatch } from "./productBatches";

export type SupplierPayment = {
  id: string;
  supplierName: string;
  amount: number;
  paidAt: string;
  note: string;
};

type SupplierEntry = {
  id: string;
  date: string;
  type: "استلام" | "إرجاع" | "دفع";
  amount: number;
  detail: string;
};

const supplierNameOf = (batch: ProductBatch) => batch.supplierName.trim() || "بدون مورد";
const inMonth = (value: string, monthKey: string) => value.slice(0, 7) === monthKey;

export const getSupplierCreditStatus = <T extends BatchProduct>(products: T[], payments: SupplierPayment[], limits: Record<string, number>) => {
  const totals = new Map<string, { supplierName: string; received: number; returned: number; paid: number }>();
  const entryFor = (supplierName: string) => {
    const current = totals.get(supplierName) ?? { supplierName, received: 0, returned: 0, paid: 0 };
    totals.set(supplierName, current);
    return current;
  };
  products.forEach((product) => (product.batches ?? []).forEach((batch) => {
    const entry = entryFor(supplierNameOf(batch));
    entry.received += batch.quantity * batch.purchasePrice;
    if (batch.supplierReturn) entry.returned += batch.supplierReturn.cost;
  }));
  payments.forEach((payment) => {
    if (!payment.supplierName.trim() || !Number.isFinite(payment.amount) || payment.amount <= 0) return;
    entryFor(payment.supplierName.trim()).paid += payment.amount;
  });
  const groups = Array.from(totals.values()).map((group) => {
    const outstanding = Math.max(0, group.received - group.returned - group.paid);
    const creditLimit = Math.max(0, Number(limits[group.supplierName]) || 0);
    const warningAt = creditLimit > 0 ? creditLimit * 0.8 : 0;
    const exceeded = creditLimit > 0 && outstanding > creditLimit;
    const nearing = creditLimit > 0 && !exceeded && outstanding >= warningAt;
    return { ...group, outstanding, creditLimit, warningAt, availableCredit: creditLimit > 0 ? Math.max(0, creditLimit - outstanding) : 0, exceeded, nearing };
  }).sort((left, right) => right.outstanding - left.outstanding || left.supplierName.localeCompare(right.supplierName, "ar"));
  return { groups, exceededCount: groups.filter((group) => group.exceeded).length, nearingCount: groups.filter((group) => group.nearing).length };
};

export const getSupplierMonthlyStatement = <T extends BatchProduct>(products: T[], payments: SupplierPayment[], supplierName: string, monthKey: string) => {
  const entries: SupplierEntry[] = [];
  products.forEach((product) => (product.batches ?? []).forEach((batch) => {
    if (supplierNameOf(batch) !== supplierName) return;
    if (inMonth(batch.receivedAt, monthKey)) entries.push({ id: `receipt-${batch.id}`, date: batch.receivedAt, type: "استلام", amount: batch.quantity * batch.purchasePrice, detail: `${product.name} · ${batch.quantity} وحدة` });
    if (batch.supplierReturn && inMonth(batch.supplierReturn.returnedAt, monthKey)) entries.push({ id: `return-${batch.id}`, date: batch.supplierReturn.returnedAt, type: "إرجاع", amount: -batch.supplierReturn.cost, detail: `${product.name} · ${batch.supplierReturn.reason}` });
  }));
  payments.filter((payment) => payment.supplierName.trim() === supplierName && inMonth(payment.paidAt, monthKey)).forEach((payment) => entries.push({ id: payment.id, date: payment.paidAt, type: "دفع", amount: -payment.amount, detail: payment.note || "دفعة للمورد" }));
  entries.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  const received = entries.filter((entry) => entry.type === "استلام").reduce((total, entry) => total + entry.amount, 0);
  const returned = Math.abs(entries.filter((entry) => entry.type === "إرجاع").reduce((total, entry) => total + entry.amount, 0));
  const paid = Math.abs(entries.filter((entry) => entry.type === "دفع").reduce((total, entry) => total + entry.amount, 0));
  return { entries, received, returned, paid, net: received - returned - paid };
};
