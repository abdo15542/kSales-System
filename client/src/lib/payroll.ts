export type PayrollPaymentMethod = "cash" | "card" | "transfer";

export type PayrollChangeType = "salary" | "advance" | "deduction" | "payment";

export type PayrollChange = {
  id: string;
  payrollId: string;
  staffMemberId: string;
  staffMemberName: string;
  type: PayrollChangeType;
  amount: number;
  reason: string;
  createdAt: string;
};

export type PayrollRecord = {
  id: string;
  staffMemberId: string;
  staffMemberName: string;
  month: string;
  baseSalary: number;
  advances: number;
  deductions: number;
  paidAmount: number;
  paymentMethod: PayrollPaymentMethod;
  note: string;
  paidAt: string;
};

export const getPayrollNet = (record: Pick<PayrollRecord, "baseSalary" | "advances" | "deductions">) => Math.max(0, Number(record.baseSalary) - Number(record.advances) - Number(record.deductions));

export const getPayrollSummary = (records: PayrollRecord[], month: string, staffMemberId?: string) => records.filter((record) => record.month === month && (!staffMemberId || record.staffMemberId === staffMemberId)).reduce((summary, record) => ({ baseSalary: summary.baseSalary + Math.max(0, record.baseSalary), advances: summary.advances + Math.max(0, record.advances), deductions: summary.deductions + Math.max(0, record.deductions), paidAmount: summary.paidAmount + Math.max(0, record.paidAmount), netDue: summary.netDue + getPayrollNet(record) }), { baseSalary: 0, advances: 0, deductions: 0, paidAmount: 0, netDue: 0 });

export const filterPayrollRecords = (records: PayrollRecord[], query: string, month: string) => records.filter((record) => record.month === month && `${record.staffMemberName} ${record.note}`.toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar"))).sort((left, right) => right.paidAt.localeCompare(left.paidAt));

export const getPayrollOutstandingByStaff = (records: PayrollRecord[], staffMemberId: string, beforeMonth?: string) => records.filter((record) => record.staffMemberId === staffMemberId && (!beforeMonth || record.month <= beforeMonth)).reduce((total, record) => total + Math.max(0, getPayrollNet(record) - record.paidAmount), 0);

export const getNextPayrollMonth = (month: string) => { const date = new Date(`${month}-01T00:00:00`); date.setMonth(date.getMonth() + 1); return date.toISOString().slice(0, 7); };
