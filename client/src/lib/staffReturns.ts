export type StaffReturnSale = {
  createdAt: string;
  isReturn?: boolean;
  total: number;
  staffMemberId?: string;
  staffMemberName?: string;
  items: Array<{ quantity: number }>;
};

export type StaffReturnEntry = { staffMemberId: string; staffMemberName: string; receipts: number; units: number; value: number };

export const getStaffReturnsReport = (sales: StaffReturnSale[], monthKey: string) => {
  const groups = new Map<string, StaffReturnEntry>();
  sales.filter((sale) => sale.isReturn && sale.createdAt.slice(0, 7) === monthKey).forEach((sale) => {
    const staffMemberId = sale.staffMemberId || "unassigned";
    const staffMemberName = sale.staffMemberName || "غير محدد";
    const existing = groups.get(staffMemberId) ?? { staffMemberId, staffMemberName, receipts: 0, units: 0, value: 0 };
    groups.set(staffMemberId, { ...existing, staffMemberName, receipts: existing.receipts + 1, units: existing.units + sale.items.reduce((total, item) => total + Math.abs(item.quantity), 0), value: existing.value + Math.abs(sale.total) });
  });
  const entries = Array.from(groups.values()).sort((left, right) => right.value - left.value || right.receipts - left.receipts || left.staffMemberName.localeCompare(right.staffMemberName, "ar"));
  return { entries, totals: entries.reduce((summary, entry) => ({ receipts: summary.receipts + entry.receipts, units: summary.units + entry.units, value: summary.value + entry.value }), { receipts: 0, units: 0, value: 0 }) };
};
