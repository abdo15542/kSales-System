export type CustomerStatementEntry = {
  id: string;
  occurredAt: string;
  type: "فاتورة آجل" | "إرجاع بيع" | "تحصيل";
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  note: string;
};

type StatementSale = {
  id: string;
  createdAt: string;
  total: number;
  paymentMethod: "cash" | "card" | "transfer" | "credit";
  customerName?: string;
  isReturn?: boolean;
  returnReason?: string;
  returnOfSaleId?: string;
};

type StatementCollection = {
  id: string;
  customerName: string;
  amount: number;
  collectedAt: string;
  note?: string;
};

const normaliseName = (value: string | undefined) => (value ?? "").trim().toLocaleLowerCase("ar");

export const getCustomerStatement = (customerName: string, sales: StatementSale[], collections: StatementCollection[]) => {
  const key = normaliseName(customerName);
  const rawEntries = [
    ...sales.filter((sale) => normaliseName(sale.customerName) === key && sale.paymentMethod === "credit").map((sale) => ({
      id: sale.id,
      occurredAt: sale.createdAt,
      type: sale.isReturn ? "إرجاع بيع" as const : "فاتورة آجل" as const,
      reference: sale.isReturn ? `إرجاع #${(sale.returnOfSaleId || sale.id).slice(-5)}` : `فاتورة #${sale.id.slice(-5)}`,
      debit: sale.isReturn ? 0 : Math.max(0, sale.total),
      credit: sale.isReturn ? Math.max(0, -sale.total) : 0,
      note: sale.isReturn ? sale.returnReason || "إرجاع بيع" : "بيع آجل",
    })),
    ...collections.filter((collection) => normaliseName(collection.customerName) === key).map((collection) => ({
      id: collection.id,
      occurredAt: collection.collectedAt,
      type: "تحصيل" as const,
      reference: `تحصيل #${collection.id.slice(-5)}`,
      debit: 0,
      credit: Math.max(0, collection.amount),
      note: collection.note || "دفعة من الزبون",
    })),
  ].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id));
  let balance = 0;
  const entries: CustomerStatementEntry[] = rawEntries.map((entry) => {
    balance += entry.debit - entry.credit;
    return { ...entry, balance };
  });
  return {
    customerName: customerName.trim(),
    entries,
    invoiced: entries.reduce((total, entry) => total + entry.debit, 0),
    returned: entries.filter((entry) => entry.type === "إرجاع بيع").reduce((total, entry) => total + entry.credit, 0),
    collected: entries.filter((entry) => entry.type === "تحصيل").reduce((total, entry) => total + entry.credit, 0),
    balance: Math.max(0, balance),
  };
};
