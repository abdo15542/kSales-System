export type EmployeeAdvanceType = "cash" | "clothing" | "goods";

export type EmployeeAdvance = {
  id: string;
  staffMemberId: string;
  staffMemberName: string;
  type: EmployeeAdvanceType;
  description: string;
  amount: number;
  quantity?: number;
  productId?: string;
  productName?: string;
  month: string;
  createdAt: string;
  settled: number;
  note: string;
};

export const isValidPayrollMonth = (month: string) => /^\d{4}-\d{2}$/.test(month);

export const getAdvanceOutstanding = (advance: Pick<EmployeeAdvance, "amount" | "settled">) => Math.max(0, Number(advance.amount) - Number(advance.settled));

export const getEmployeeAdvanceTotal = (advances: EmployeeAdvance[], staffMemberId: string, month?: string) => advances.filter((advance) => advance.staffMemberId === staffMemberId && (!month || advance.month === month)).reduce((total, advance) => total + getAdvanceOutstanding(advance), 0);

export const filterEmployeeAdvances = (advances: EmployeeAdvance[], query: string, month?: string) => advances.filter((advance) => (!month || advance.month === month) && `${advance.staffMemberName} ${advance.description} ${advance.productName ?? ""} ${advance.note}`.toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar"))).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
