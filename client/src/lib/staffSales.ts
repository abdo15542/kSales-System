type StaffSale = {
  createdAt: string;
  total: number;
  profit: number;
  staffMemberId?: string;
  staffMemberName?: string;
  isReturn?: boolean;
};

export type StaffSalesEntry = {
  staffMemberId: string;
  staffMemberName: string;
  invoices: number;
  returns: number;
  sales: number;
  profit: number;
};

export const getStaffSalesReport = (sales: StaffSale[], monthKey: string) => {
  const entries = new Map<string, StaffSalesEntry>();
  sales.filter((sale) => sale.createdAt.slice(0, 7) === monthKey).forEach((sale) => {
    const staffMemberId = sale.staffMemberId || "unassigned";
    const staffMemberName = sale.staffMemberName?.trim() || "غير محدد";
    const entry = entries.get(staffMemberId) ?? { staffMemberId, staffMemberName, invoices: 0, returns: 0, sales: 0, profit: 0 };
    if (sale.isReturn) entry.returns += 1;
    else entry.invoices += 1;
    entry.sales += Number(sale.total) || 0;
    entry.profit += Number(sale.profit) || 0;
    entries.set(staffMemberId, entry);
  });
  const rows = Array.from(entries.values()).sort((left, right) => right.sales - left.sales || right.profit - left.profit || left.staffMemberName.localeCompare(right.staffMemberName, "ar"));
  return { entries: rows, totals: { invoices: rows.reduce((total, entry) => total + entry.invoices, 0), returns: rows.reduce((total, entry) => total + entry.returns, 0), sales: rows.reduce((total, entry) => total + entry.sales, 0), profit: rows.reduce((total, entry) => total + entry.profit, 0) } };
};
