export type StaffDailyMovement = {
  staffMemberId?: string;
  isReturn?: boolean;
  total: number;
  items: Array<{ quantity: number }>;
};

export type CurrentStaffDailySummary = {
  salesInvoices: number;
  salesValue: number;
  returnInvoices: number;
  returnUnits: number;
  returnValue: number;
};

export function getCurrentStaffDailySummary(
  movements: StaffDailyMovement[],
  staffMemberId: string,
): CurrentStaffDailySummary {
  const staffMovements = movements.filter((movement) => movement.staffMemberId === staffMemberId);
  const sales = staffMovements.filter((movement) => !movement.isReturn);
  const returns = staffMovements.filter((movement) => movement.isReturn);

  return {
    salesInvoices: sales.length,
    salesValue: sales.reduce((total, sale) => total + sale.total, 0),
    returnInvoices: returns.length,
    returnUnits: returns.reduce(
      (total, sale) => total + sale.items.reduce((units, item) => units + Math.abs(item.quantity), 0),
      0,
    ),
    returnValue: returns.reduce((total, sale) => total + Math.abs(sale.total), 0),
  };
}
