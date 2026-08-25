import type { EmployeeAdvance } from "./employeeAdvances";

type EmployeePurchaseSale = {
  id: string;
  createdAt: string;
  total: number;
  employeePurchaseStaffMemberId?: string;
  employeePurchaseStaffMemberName?: string;
  isReturn?: boolean;
  returnOfSaleId?: string;
  returnReason?: string;
  note?: string;
};

export type EmployeeStatementEntry = {
  id: string;
  occurredAt: string;
  type: "فاتورة بضاعة" | "إرجاع بضاعة" | "سلفة أو عهدة";
  reference: string;
  amount: number;
  outstanding: number;
  balance: number;
  note: string;
};

export const getEmployeeStatement = (staffMemberId: string, sales: EmployeePurchaseSale[], advances: EmployeeAdvance[]) => {
  const purchaseAdvances = new Map(advances.filter((advance) => advance.staffMemberId === staffMemberId && advance.saleId).map((advance) => [advance.saleId as string, advance]));
  const purchases = sales.filter((sale) => sale.employeePurchaseStaffMemberId === staffMemberId).map((sale) => sale.isReturn ? ({ id: sale.id, occurredAt: sale.createdAt, type: "إرجاع بضاعة" as const, reference: `إرجاع #${(sale.returnOfSaleId || sale.id).slice(-5)}`, amount: -Math.abs(sale.total), outstanding: 0, note: sale.returnReason || sale.note || "إرجاع مشتريات موظف" }) : ({ id: sale.id, occurredAt: sale.createdAt, type: "فاتورة بضاعة" as const, reference: `فاتورة #${sale.id.slice(-5)}`, amount: Math.max(0, sale.total), outstanding: Math.max(0, (purchaseAdvances.get(sale.id)?.amount ?? sale.total) - (purchaseAdvances.get(sale.id)?.settled ?? 0)), note: sale.note || "مشتريات موظف من المخزون" }));
  const standaloneAdvances = advances.filter((advance) => advance.staffMemberId === staffMemberId && !advance.saleId).map((advance) => ({ id: advance.id, occurredAt: advance.createdAt, type: "سلفة أو عهدة" as const, reference: advance.type === "cash" ? "سلفة نقدية" : advance.type === "clothing" ? "عهدة ملابس" : "عهدة بضاعة", amount: Math.max(0, advance.amount), outstanding: Math.max(0, advance.amount - advance.settled), note: advance.description }));
  let balance = 0;
  const entries: EmployeeStatementEntry[] = [...purchases, ...standaloneAdvances].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id)).map((entry) => {
    balance += entry.outstanding;
    return { ...entry, balance };
  });
  return { entries, invoices: purchases.filter((entry) => entry.type === "فاتورة بضاعة").length, advances: standaloneAdvances.length, recordedTotal: entries.reduce((total, entry) => total + entry.amount, 0), outstanding: entries.reduce((total, entry) => total + entry.outstanding, 0) };
};
