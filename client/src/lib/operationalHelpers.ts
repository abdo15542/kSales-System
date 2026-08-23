export type CustomerSaleSource = { customerName?: string; paymentMethod?: string; createdAt?: string };
export type CustomerDebtSource = { customerName: string; amount: number; paid: number };

export type RecurringCustomer = {
  name: string;
  visits: number;
  outstanding: number;
};

export const isBackupDueToday = (lastBackupAt: string, now = new Date()) => {
  if (!lastBackupAt || Number.isNaN(Date.parse(lastBackupAt))) return true;
  return new Date(lastBackupAt).toDateString() !== now.toDateString();
};

export const getRecurringCustomers = (sales: CustomerSaleSource[], debts: CustomerDebtSource[]): RecurringCustomer[] => {
  const customers = new Map<string, RecurringCustomer>();
  const add = (value: string, visit = 0, outstanding = 0) => {
    const name = value.trim();
    if (!name) return;
    const current = customers.get(name) ?? { name, visits: 0, outstanding: 0 };
    current.visits += visit;
    current.outstanding += outstanding;
    customers.set(name, current);
  };
  sales.forEach((sale) => {
    if (sale.paymentMethod === "credit" && sale.customerName) add(sale.customerName, 1);
  });
  debts.forEach((debt) => add(debt.customerName, 0, Math.max(0, debt.amount - debt.paid)));
  return Array.from(customers.values()).sort((a, b) => b.visits - a.visits || b.outstanding - a.outstanding || a.name.localeCompare(b.name, "ar"));
};

export const isLocalProductImage = (value: unknown): value is string =>
  typeof value === "string" && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(value);
