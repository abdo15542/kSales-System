export type DailyPaymentSale = {
  createdAt: string;
  paymentMethod: "cash" | "card" | "transfer" | "credit";
  total: number;
  isReturn?: boolean;
};

export type DailyPaymentSummaryRow = {
  paymentMethod: "cash" | "card" | "transfer" | "credit";
  label: string;
  saleReceipts: number;
  returnReceipts: number;
  grossSales: number;
  returnedValue: number;
  netSales: number;
};

const DAY_START_LENGTH = 10;

export const getDailyPaymentSummary = (sales: DailyPaymentSale[], date: string): DailyPaymentSummaryRow[] => (["cash", "card", "transfer", "credit"] as const).map((paymentMethod) => {
  const entries = sales.filter((sale) => sale.createdAt.slice(0, DAY_START_LENGTH) === date && sale.paymentMethod === paymentMethod);
  const salesEntries = entries.filter((sale) => !sale.isReturn);
  const returnEntries = entries.filter((sale) => sale.isReturn);
  const grossSales = salesEntries.reduce((total, sale) => total + Math.max(0, sale.total), 0);
  const returnedValue = returnEntries.reduce((total, sale) => total + Math.abs(sale.total), 0);
  return { paymentMethod, label: paymentMethod === "cash" ? "نقدًا" : paymentMethod === "card" ? "بطاقة مصرفية" : paymentMethod === "transfer" ? "تحويل مصرفي" : "آجل / ذمة", saleReceipts: salesEntries.length, returnReceipts: returnEntries.length, grossSales, returnedValue, netSales: grossSales - returnedValue };
});

export const getDailyPaymentSummaryTotals = (rows: DailyPaymentSummaryRow[]) => rows.reduce((total, row) => ({ saleReceipts: total.saleReceipts + row.saleReceipts, returnReceipts: total.returnReceipts + row.returnReceipts, grossSales: total.grossSales + row.grossSales, returnedValue: total.returnedValue + row.returnedValue, netSales: total.netSales + row.netSales }), { saleReceipts: 0, returnReceipts: 0, grossSales: 0, returnedValue: 0, netSales: 0 });
