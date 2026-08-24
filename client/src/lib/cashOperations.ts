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
): DailyCashSummary {
  const dailySales = sales.filter((sale) => matchesDate(sale.createdAt, date));
  const dailyExpenses = expenses.filter((expense) => matchesDate(expense.spentAt, date));
  const cashSales = dailySales.filter((sale) => sale.paymentMethod === "cash").reduce((total, sale) => total + safeAmount(sale.total), 0);
  const creditSales = dailySales.filter((sale) => sale.paymentMethod === "credit").reduce((total, sale) => total + safeAmount(sale.total), 0);
  const expensesTotal = dailyExpenses.reduce((total, expense) => total + safeAmount(expense.amount), 0);
  const grossProfit = dailySales.reduce((total, sale) => total + (Number.isFinite(sale.profit) ? sale.profit : 0), 0);
  const normalizedOpening = Math.max(0, Number.isFinite(openingCash) ? openingCash : 0);
  const normalizedActual = actualCash === undefined || !Number.isFinite(actualCash) ? null : Math.max(0, actualCash);
  const expectedCash = normalizedOpening + cashSales - expensesTotal;

  return {
    date,
    invoices: dailySales.length,
    cashSales,
    creditSales,
    revenue: cashSales + creditSales,
    grossProfit,
    expenses: expensesTotal,
    netOperatingProfit: grossProfit - expensesTotal,
    expectedCash,
    actualCash: normalizedActual,
    variance: normalizedActual === null ? null : normalizedActual - expectedCash,
  };
}

export function getCashClosingForDate(closings: CashClosing[], date: string) {
  return closings
    .filter((closing) => closing.date === date)
    .sort((left, right) => right.closedAt.localeCompare(left.closedAt))[0];
}
