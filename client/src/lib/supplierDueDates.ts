export type SupplierDueDateStatus = {
  supplierName: string;
  outstanding: number;
  dueDate: string;
  daysUntilDue: number;
  overdue: boolean;
  nearing: boolean;
};

type SupplierBalance = {
  supplierName: string;
  outstanding: number;
};

const isValidDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const dayDistance = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000);

export function getSupplierDueDateStatuses(groups: SupplierBalance[], dueDates: Record<string, string>, today: string, warningDays = 3): SupplierDueDateStatus[] {
  return groups
    .filter((group) => Number.isFinite(group.outstanding) && group.outstanding > 0)
    .flatMap((group) => {
      const dueDate = dueDates[group.supplierName] ?? "";
      if (!isValidDateKey(dueDate)) return [];
      const daysUntilDue = dayDistance(today, dueDate);
      return [{
        supplierName: group.supplierName,
        outstanding: group.outstanding,
        dueDate,
        daysUntilDue,
        overdue: daysUntilDue < 0,
        nearing: daysUntilDue >= 0 && daysUntilDue <= warningDays,
      }];
    })
    .sort((left, right) => left.daysUntilDue - right.daysUntilDue || left.supplierName.localeCompare(right.supplierName, "ar"));
}
