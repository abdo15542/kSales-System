export type WeeklySale = { createdAt: string; total: number; profit: number };

export type WeeklySummary = { revenue: number; profit: number; invoices: number; startAt: string; endAt: string };

export const normalizeLibyanPhoneForWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("218")) return digits;
  if (digits.startsWith("0")) return `218${digits.slice(1)}`;
  return digits;
};

export const buildDebtReminderUrl = (input: { phone: string; customerName: string; remaining: number; storeName: string }) => {
  const phone = normalizeLibyanPhoneForWhatsApp(input.phone);
  const message = `مرحبًا ${input.customerName}، نذكّرك بأن المتبقي لديك لدى ${input.storeName} هو ${input.remaining.toFixed(2)} د.ل. شكرًا لك.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export const getWeeklySummary = (sales: WeeklySale[], now = new Date()): WeeklySummary => {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const weeklySales = sales.filter((sale) => {
    const issuedAt = new Date(sale.createdAt);
    return issuedAt >= start && issuedAt <= end;
  });
  return {
    revenue: weeklySales.reduce((total, sale) => total + sale.total, 0),
    profit: weeklySales.reduce((total, sale) => total + sale.profit, 0),
    invoices: weeklySales.length,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
};

export const getStocktakeDifference = (recordedQuantity: number, actualQuantity: number) => actualQuantity - recordedQuantity;
