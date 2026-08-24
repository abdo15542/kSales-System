export type SupplierReturnNoticeProduct = { name: string; sku: string };
export type SupplierReturnNoticeBatch = {
  supplierName: string;
  expiryDate: string;
  supplierReturn?: { returnedAt: string; reason: string; quantity: number; cost: number };
};

export const buildSupplierReturnNoticeHtml = (
  storeName: string,
  product: SupplierReturnNoticeProduct,
  batch: SupplierReturnNoticeBatch,
  money: (value: number) => string,
  formatDate: (value: string) => string,
  escapeHtml: (value: string) => string,
) => {
  if (!batch.supplierReturn) return "";
  const returned = batch.supplierReturn;
  return `<h1>إشعار إرجاع إلى المورد</h1><p>${escapeHtml(storeName)} · ${formatDate(returned.returnedAt)}</p><table><tbody><tr><th>الصنف</th><td>${escapeHtml(product.name)}</td></tr><tr><th>رمز الصنف</th><td dir="ltr">${escapeHtml(product.sku)}</td></tr><tr><th>المورد</th><td>${escapeHtml(batch.supplierName || "غير محدد")}</td></tr><tr><th>الكمية المرجعة</th><td>${returned.quantity}</td></tr><tr><th>قيمة الإرجاع</th><td dir="ltr">${money(returned.cost)}</td></tr><tr><th>سبب الإرجاع</th><td>${escapeHtml(returned.reason)}</td></tr><tr><th>تاريخ الصلاحية</th><td dir="ltr">${escapeHtml(batch.expiryDate || "غير محدد")}</td></tr></tbody></table><p class="foot">تم إنشاء هذا الإشعار محليًا من سجل الدفعات.</p>`;
};
