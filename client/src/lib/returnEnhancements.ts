export const RETURN_REASON_PRESETS = ["إرجاع الزبون", "خطأ في الفاتورة", "لا يطابق الطلب", "تلف عند التسليم", "سبب آخر"] as const;

type SearchableSale = { id: string; total: number; isReturn?: boolean; customerName?: string };

export const searchReturnableSales = <T extends SearchableSale>(sales: T[], query: string) => {
  const term = query.trim().toLocaleLowerCase("ar");
  return sales.filter((sale) => !sale.isReturn && sale.total > 0 && (!term || sale.id.toLocaleLowerCase("ar").includes(term) || sale.id.slice(-5).toLocaleLowerCase("ar").includes(term) || (sale.customerName || "").toLocaleLowerCase("ar").includes(term)));
};

type ReturnReceiptSale = { id: string; createdAt: string; total: number; returnOfSaleId?: string; returnReason?: string; items: Array<{ name: string; quantity: number; price: number }> };

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);

export const buildReturnReceiptRows = (sale: ReturnReceiptSale) => sale.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${Math.abs(item.quantity)}</td><td>${Math.abs(item.quantity * item.price).toFixed(2)}</td></tr>`).join("");
