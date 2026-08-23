export type WeeklySaleRecord = { createdAt: string; total: number; profit: number };

export type StocktakeSchedule = { weekday: number; lastCompletedAt?: string };

export const isWeeklyStocktakeDue = (schedule: StocktakeSchedule, now = new Date()) => {
  if (now.getDay() !== schedule.weekday) return false;
  if (!schedule.lastCompletedAt) return true;
  return new Date(schedule.lastCompletedAt).toDateString() !== now.toDateString();
};

export const getWeekComparison = (sales: WeeklySaleRecord[], now = new Date()) => {
  const currentEnd = new Date(now);
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 6);
  currentStart.setHours(0, 0, 0, 0);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 7);
  const previousEnd = new Date(currentStart);
  previousEnd.setMilliseconds(-1);
  const summarize = (start: Date, end: Date) => sales.filter((sale) => {
    const issuedAt = new Date(sale.createdAt);
    return issuedAt >= start && issuedAt <= end;
  }).reduce((summary, sale) => ({ revenue: summary.revenue + sale.total, profit: summary.profit + sale.profit, invoices: summary.invoices + 1 }), { revenue: 0, profit: 0, invoices: 0 });
  const current = summarize(currentStart, currentEnd);
  const previous = summarize(previousStart, previousEnd);
  return {
    current,
    previous,
    revenueChange: current.revenue - previous.revenue,
    profitChange: current.profit - previous.profit,
  };
};
