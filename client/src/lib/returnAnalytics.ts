export type ReturnFilter = { fromDate?: string; toDate?: string; reason?: string };

type ReturnLike = { isReturn?: boolean; createdAt: string; returnReason?: string };

export const getReturnReasons = (sales: ReturnLike[]) => Array.from(new Set(sales.filter((sale) => sale.isReturn).map((sale) => sale.returnReason?.trim() || "غير محدد"))).sort((left, right) => left.localeCompare(right, "ar"));

export const filterReturnSales = <T extends ReturnLike>(sales: T[], filter: ReturnFilter) => sales.filter((sale) => {
  if (!sale.isReturn) return false;
  const date = sale.createdAt.slice(0, 10);
  const reason = sale.returnReason?.trim() || "غير محدد";
  return (!filter.fromDate || date >= filter.fromDate) && (!filter.toDate || date <= filter.toDate) && (!filter.reason || reason === filter.reason);
}).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
