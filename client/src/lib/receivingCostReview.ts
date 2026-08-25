export type ReceivingCostReview = {
  previousCost: number;
  nextCost: number;
  difference: number;
  percentChange: number | null;
  direction: "unchanged" | "up" | "down";
};

export const getReceivingCostReview = (previousCost: number, nextCost: number): ReceivingCostReview => {
  const previous = Math.max(0, Number.isFinite(previousCost) ? previousCost : 0);
  const next = Math.max(0, Number.isFinite(nextCost) ? nextCost : 0);
  const difference = next - previous;
  return {
    previousCost: previous,
    nextCost: next,
    difference,
    percentChange: previous > 0 ? (difference / previous) * 100 : null,
    direction: difference === 0 ? "unchanged" : difference > 0 ? "up" : "down",
  };
};

const escapeReceiptHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character] ?? character));

export const buildGoodsReceiptNoticeHtml = ({
  storeName,
  productName,
  barcode,
  quantity,
  unitCost,
  totalCost,
  supplierName,
  invoiceRef,
  expiryDate,
  receivedAt,
  internalReference,
  costReview,
  staffMemberName,
}: {
  storeName: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitCost: string;
  totalCost: string;
  supplierName: string;
  invoiceRef: string;
  expiryDate: string;
  receivedAt: string;
  internalReference: string;
  costReview: ReceivingCostReview;
  staffMemberName?: string;
}) => `<h1>إيصال استلام بضاعة</h1><p>${escapeReceiptHtml(storeName)} · ${escapeReceiptHtml(receivedAt)}</p><table><tbody>
<tr><th>مرجع الاستلام</th><td dir="ltr">${escapeReceiptHtml(internalReference)}</td></tr>
<tr><th>الصنف</th><td>${escapeReceiptHtml(productName)}</td></tr>
<tr><th>الباركود</th><td dir="ltr">${escapeReceiptHtml(barcode)}</td></tr>
<tr><th>الكمية المستلمة</th><td>${quantity}</td></tr>
<tr><th>سعر شراء الوحدة</th><td dir="ltr">${escapeReceiptHtml(unitCost)}</td></tr>
<tr><th>إجمالي تكلفة الاستلام</th><td dir="ltr">${escapeReceiptHtml(totalCost)}</td></tr>
<tr><th>المورد</th><td>${escapeReceiptHtml(supplierName || "غير محدد")}</td></tr>
${staffMemberName ? `<tr><th>الموظف المسؤول</th><td>${escapeReceiptHtml(staffMemberName)}</td></tr>` : ""}
${invoiceRef ? `<tr><th>مرجع فاتورة الشراء</th><td dir="ltr">${escapeReceiptHtml(invoiceRef)}</td></tr>` : ""}
${expiryDate ? `<tr><th>تاريخ الصلاحية</th><td dir="ltr">${escapeReceiptHtml(expiryDate)}</td></tr>` : ""}
<tr><th>فرق التكلفة</th><td>${costReview.direction === "unchanged" ? "لا تغيير" : `${costReview.direction === "up" ? "ارتفاع" : "انخفاض"} ${escapeReceiptHtml(String(Math.abs(costReview.difference)))}`}${costReview.percentChange === null ? "" : ` (${costReview.percentChange.toFixed(1)}%)`}</td></tr>
</tbody></table><p class="foot">تم إنشاء هذا الإيصال محليًا من عملية الاستلام المعتمدة.</p>`;
