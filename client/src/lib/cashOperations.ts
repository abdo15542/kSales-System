export type CashExpense = {
  id: string;
  amount: number;
  category: string;
  note: string;
  spentAt: string;
};

export type CashClosing = {
  id: string;
  date: string;
  openingCash: number;
  actualCash: number;
  note: string;
  closedAt: string;
};

export type DebtCollection = {
  id: string;
  debtId: string;
  customerName: string;
  amount: number;
  collectedAt: string;
  note: string;
};

type SaleForCashOperations = {
  createdAt: string;
  total: number;
  profit: number;
  paymentMethod: "cash" | "credit";
};

const matchesDate = (timestamp: string, date: string) => timestamp.slice(0, 10) === date;
const safeAmount = (amount: number) => Number.isFinite(amount) && amount > 0 ? amount : 0;

export type DailyCashSummary = {
  date: string;
  invoices: number;
  cashSales: number;
  creditSales: number;
  debtCollections: number;
  collectionCount: number;
  revenue: number;
  grossProfit: number;
  expenses: number;
  netOperatingProfit: number;
  expectedCash: number;
  actualCash: number | null;
  variance: number | null;
};

export function getDailyCashSummary(
  sales: SaleForCashOperations[],
  expenses: CashExpense[],
  date: string,
  openingCash = 0,
  actualCash?: number,
  collections: DebtCollection[] = [],
): DailyCashSummary {
  const dailySales = sales.filter((sale) => matchesDate(sale.createdAt, date));
  const dailyExpenses = expenses.filter((expense) => matchesDate(expense.spentAt, date));
  const dailyCollections = collections.filter((collection) => matchesDate(collection.collectedAt, date));
  const cashSales = dailySales.filter((sale) => sale.paymentMethod === "cash").reduce((total, sale) => total + safeAmount(sale.total), 0);
  const creditSales = dailySales.filter((sale) => sale.paymentMethod === "credit").reduce((total, sale) => total + safeAmount(sale.total), 0);
  const debtCollections = dailyCollections.reduce((total, collection) => total + safeAmount(collection.amount), 0);
  const expensesTotal = dailyExpenses.reduce((total, expense) => total + safeAmount(expense.amount), 0);
  const grossProfit = dailySales.reduce((total, sale) => total + (Number.isFinite(sale.profit) ? sale.profit : 0), 0);
  const normalizedOpening = Math.max(0, Number.isFinite(openingCash) ? openingCash : 0);
  const normalizedActual = actualCash === undefined || !Number.isFinite(actualCash) ? null : Math.max(0, actualCash);
  const expectedCash = normalizedOpening + cashSales + debtCollections - expensesTotal;

  return {
    date,
    invoices: dailySales.length,
    cashSales,
    creditSales,
    debtCollections,
    collectionCount: dailyCollections.length,
    revenue: cashSales + creditSales,
    grossProfit,
    expenses: expensesTotal,
    netOperatingProfit: grossProfit - expensesTotal,
    expectedCash,
    actualCash: normalizedActual,
    variance: normalizedActual === null ? null : normalizedActual - expectedCash,
  };
}

export type DailyExpenseLimitStatus = {
  active: boolean;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  nearing: boolean;
  exceeded: boolean;
};

export function getDailyExpenseLimitStatus(expenses: CashExpense[], date: string, limit: number): DailyExpenseLimitStatus {
  const spent = expenses.filter((expense) => matchesDate(expense.spentAt, date)).reduce((total, expense) => total + safeAmount(expense.amount), 0);
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 0;
  const percentage = normalizedLimit ? (spent / normalizedLimit) * 100 : 0;
  return {
    active: normalizedLimit > 0,
    limit: normalizedLimit,
    spent,
    remaining: Math.max(0, normalizedLimit - spent),
    percentage,
    nearing: normalizedLimit > 0 && percentage >= 80 && percentage <= 100,
    exceeded: normalizedLimit > 0 && spent > normalizedLimit,
  };
}

export type MonthlyExpenseGroup = {
  category: string;
  amount: number;
  count: number;
  expenses: CashExpense[];
};

export type MonthlyExpenseReport = {
  monthKey: string;
  amount: number;
  count: number;
  groups: MonthlyExpenseGroup[];
};

export function getMonthlyExpenseReport(expenses: CashExpense[], monthKey: string): MonthlyExpenseReport {
  const monthlyExpenses = expenses.filter((expense) => expense.spentAt.slice(0, 7) === monthKey);
  const categoryMap = new Map<string, CashExpense[]>();
  monthlyExpenses.forEach((expense) => {
    const category = expense.category.trim() || "غير مصنف";
    categoryMap.set(category, [...(categoryMap.get(category) ?? []), expense]);
  });
  const groups = Array.from(categoryMap.entries()).map(([category, entries]) => ({
    category,
    amount: entries.reduce((total, expense) => total + safeAmount(expense.amount), 0),
    count: entries.length,
    expenses: entries,
  })).sort((left, right) => right.amount - left.amount || left.category.localeCompare(right.category, "ar"));
  return {
    monthKey,
    amount: monthlyExpenses.reduce((total, expense) => total + safeAmount(expense.amount), 0),
    count: monthlyExpenses.length,
    groups,
  };
}

export function getCashClosingForDate(closings: CashClosing[], date: string) {
  return closings
    .filter((closing) => closing.date === date)
    .sort((left, right) => right.closedAt.localeCompare(left.closedAt))[0];
}
