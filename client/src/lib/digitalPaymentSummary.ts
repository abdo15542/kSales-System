import { getPaymentMethodLabel, type PaymentMethod } from "./paymentMethods";

export type DigitalPaymentSale = {
  createdAt: string;
  paymentMethod: PaymentMethod;
  total: number;
  isReturn?: boolean;
  bankName?: string;
  posTerminalType?: string;
  paymentSplits?: Array<{ paymentMethod: "cash" | "card" | "transfer" | "credit"; amount: number; bankName?: string; posTerminalType?: string }>;
};

export type DigitalPaymentSummaryRow = {
  paymentMethod: "card" | "transfer";
  label: string;
  bankName: string;
  posTerminalType: string;
  saleReceipts: number;
  returnReceipts: number;
  grossSales: number;
  returnedValue: number;
  netSales: number;
};

export const getDigitalPaymentSummary = (sales: DigitalPaymentSale[], date: string): DigitalPaymentSummaryRow[] => {
  const groups = new Map<string, DigitalPaymentSummaryRow>();
  sales.filter((sale) => sale.createdAt.slice(0, 10) === date).flatMap((sale) => sale.paymentSplits?.length ? sale.paymentSplits.filter((split) => split.paymentMethod === "card" || split.paymentMethod === "transfer").map((split) => ({ ...sale, paymentMethod: split.paymentMethod, total: split.amount, bankName: split.bankName, posTerminalType: split.posTerminalType })) : (sale.paymentMethod === "card" || sale.paymentMethod === "transfer") ? [sale] : []).forEach((sale) => {
    const paymentMethod = sale.paymentMethod as "card" | "transfer";
    const bankName = sale.bankName?.trim() || "غير محدد";
    const posTerminalType = sale.posTerminalType?.trim() || "غير محدد";
    const key = `${paymentMethod}|${bankName}|${posTerminalType}`;
    const current = groups.get(key) ?? { paymentMethod, label: getPaymentMethodLabel(paymentMethod), bankName, posTerminalType, saleReceipts: 0, returnReceipts: 0, grossSales: 0, returnedValue: 0, netSales: 0 };
    if (sale.isReturn) {
      current.returnReceipts += 1;
      current.returnedValue += Math.abs(Number.isFinite(sale.total) ? sale.total : 0);
    } else {
      current.saleReceipts += 1;
      current.grossSales += Math.max(0, Number.isFinite(sale.total) ? sale.total : 0);
    }
    current.netSales = current.grossSales - current.returnedValue;
    groups.set(key, current);
  });
  return Array.from(groups.values()).sort((left, right) => left.paymentMethod.localeCompare(right.paymentMethod) || left.bankName.localeCompare(right.bankName, "ar") || left.posTerminalType.localeCompare(right.posTerminalType, "ar"));
};
