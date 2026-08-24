type CreditDebt = {
  customerName: string;
  amount: number;
  paid: number;
};

const customerKey = (name: string) => name.trim().toLocaleLowerCase("ar");

export const getCustomerOutstandingBalance = (customerName: string, debts: CreditDebt[]) => debts
  .filter((debt) => customerKey(debt.customerName) === customerKey(customerName))
  .reduce((total, debt) => total + Math.max(0, Number(debt.amount) || 0) - Math.max(0, Number(debt.paid) || 0), 0);

export const getCustomerCreditStatus = (customerName: string, creditLimits: Record<string, number>, debts: CreditDebt[], pendingCredit = 0) => {
  const key = customerKey(customerName);
  const rawLimit = creditLimits[key];
  const limit = Number.isFinite(rawLimit) && rawLimit >= 0 ? rawLimit : null;
  const outstanding = Math.max(0, getCustomerOutstandingBalance(customerName, debts));
  const projected = outstanding + Math.max(0, Number(pendingCredit) || 0);
  const ratio = limit === null || limit === 0 ? (projected > 0 ? Number.POSITIVE_INFINITY : 0) : projected / limit;
  return { outstanding, pendingCredit: Math.max(0, Number(pendingCredit) || 0), projected, limit, ratio, blocked: limit !== null && projected > limit, warning: limit !== null && !Number.isFinite(ratio) ? false : ratio >= 0.8 };
};

export const normaliseCustomerCreditLimits = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, number>;
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((limits, [name, limit]) => {
    const amount = Number(limit);
    const key = customerKey(name);
    if (key && Number.isFinite(amount) && amount >= 0) limits[key] = amount;
    return limits;
  }, {});
};
