import { describe, expect, it } from "vitest";
import { getNearDepletionProducts, getRecurringCustomers, isBackupDueToday, isLocalProductImage } from "../client/src/lib/operationalHelpers";
import { buildReceiptQrMarkup, buildReceiptQrPayload, makeReceiptQrDataUrl } from "../client/src/lib/receiptQr";
import { buildReceiptPrintHtml } from "../client/src/lib/receiptTemplate";
import { buildPriceChangeDrafts, isSettledDebt } from "../client/src/lib/storeHistory";
import { buildReceiptPdfLines } from "../client/src/lib/receiptPdf";
import { buildDebtReminderUrl, getStocktakeDifference, getWeeklySummary } from "../client/src/lib/weeklyOperations";
import { getWeekComparison, isWeeklyStocktakeDue } from "../client/src/lib/weeklyPlanning";
import { buildShelfLabelsPrintHtml } from "../client/src/lib/shelfLabels";
import { getPrintableBarcodeValue } from "../client/src/lib/labelBarcode";
import { getInactiveProducts, getMonthlyReport } from "../client/src/lib/monthlyOperations";
import { getExpiryStatus, getExpiringProducts, getSupplierPurchaseList } from "../client/src/lib/inventoryPlanning";
import { cancelUnconsumedBatch, consumeBatchesFefo, getBatchHistory, getBatchRemainingTotal, getEarliestActiveExpiry, getExpirySortedBatchInventory, getExpiryWasteReport, reconcileBatchStocktake, updateUnconsumedBatch } from "../client/src/lib/productBatches";

describe("تحسينات التشغيل المحلي", () => {
  it("يذكّر بالنسخة الاحتياطية مرة في كل يوم جديد", () => {
    const now = new Date("2026-08-23T12:00:00");
    expect(isBackupDueToday("", now)).toBe(true);
    expect(isBackupDueToday("2026-08-22T21:00:00", now)).toBe(true);
    expect(isBackupDueToday("2026-08-23T08:00:00", now)).toBe(false);
  });

  it("يجمع الزبائن المتكررين والذمم القائمة", () => {
    expect(getRecurringCustomers(
      [{ paymentMethod: "credit", customerName: "أحمد" }, { paymentMethod: "credit", customerName: "أحمد" }, { paymentMethod: "cash", customerName: "سالم" }],
      [{ customerName: "أحمد", amount: 20, paid: 5 }, { customerName: "مريم", amount: 10, paid: 0 }],
    )).toEqual([
      { name: "أحمد", visits: 2, outstanding: 15 },
      { name: "مريم", visits: 0, outstanding: 10 },
    ]);
  });

  it("يقبل صور الأصناف المحلية المضغوطة فقط", () => {
    expect(isLocalProductImage("data:image/png;base64,AA==")).toBe(true);
    expect(isLocalProductImage("https://example.test/item.jpg")).toBe(false);
  });

  it("يميز الكميات القريبة من حد المخزون المنخفض قبل تجاوزه", () => {
    expect(getNearDepletionProducts([
      { id: "one", quantity: 1, lowStockAt: 5 },
      { id: "watch", quantity: 7, lowStockAt: 5 },
      { id: "empty", quantity: 0, lowStockAt: 5 },
    ]).map((product) => product.id)).toEqual(["watch"]);
  });

  it("يبني محتوى QR مختصرًا للفاتورة دون تفاصيل الأصناف", () => {
    expect(JSON.parse(buildReceiptQrPayload({ id: "sale-123456789", createdAt: "2026-08-23T12:00:00.000Z", total: 12.5, paymentMethod: "cash" }, "محل الندى", "0910000000"))).toEqual({
      app: "souqna", store: "محل الندى", phone: "0910000000", invoice: "23456789", issuedAt: "2026-08-23T12:00:00.000Z", total: 12.5, payment: "cash",
    });
  });

  it("ينتج رمز QR كصورة محلية للطباعة", async () => {
    const payload = buildReceiptQrPayload({ id: "sale-123456789", createdAt: "2026-08-23T12:00:00.000Z", total: 12.5, paymentMethod: "cash" }, "محل الندى");
    await expect(makeReceiptQrDataUrl(payload)).resolves.toMatch(/^data:image\/png;base64,/);
  });

  it("يضم رمز QR داخل HTML الإيصال", () => {
    expect(buildReceiptQrMarkup("data:image/png;base64,qr-test")).toContain('class="receipt-qr"');
    expect(buildReceiptQrMarkup("data:image/png;base64,qr-test")).toContain('src="data:image/png;base64,qr-test"');
  });

  it("يمرر QR ضمن HTML الإيصال الكامل المعد للطباعة", () => {
    const printHtml = buildReceiptPrintHtml({
      brandHtml: "<header>محل الندى</header>", invoiceHtml: "<p>فاتورة</p>", rowsHtml: "<tr><td>صنف</td></tr>", subtotalHtml: "", discountHtml: "", totalHtml: "<strong>12.5</strong>", qrHtml: buildReceiptQrMarkup("data:image/png;base64,qr-test"), footerHtml: "<footer>شكرًا</footer>",
    });
    expect(printHtml).toContain('class="receipt-qr"');
    expect(printHtml).toContain('data:image/png;base64,qr-test');
  });

  it("يفصل الذمم المسددة ويحدد فروق الأسعار فقط عند التعديل", () => {
    expect(isSettledDebt({ amount: 10, paid: 10 })).toBe(true);
    expect(isSettledDebt({ amount: 10, paid: 9.5 })).toBe(false);
    expect(buildPriceChangeDrafts(
      { id: "p1", name: "زيت", purchasePrice: 5, salePrice: 8 },
      { id: "p1", name: "زيت", purchasePrice: 6, salePrice: 8.5 },
    )).toEqual([
      { field: "purchasePrice", previous: 5, next: 6 },
      { field: "salePrice", previous: 8, next: 8.5 },
    ]);
  });

  it("يبني محتوى PDF للإيصال مع الأسعار والإجمالي", () => {
    const lines = buildReceiptPdfLines({
      storeName: "محل الندى", invoiceNumber: "12345", createdAt: "23 أغسطس", paymentLabel: "نقدًا", items: [{ name: "زيت", quantity: 2, price: 4 }], subtotal: 8, discountAmount: 1, total: 7,
    });
    expect(lines).toContain("الإجمالي: 7.00 د.ل");
    expect(lines).toContain("2 × 4.00 د.ل = 8.00 د.ل");
  });

  it("ينشئ رابط واتساب يدويًا وملخص ربح أسبوعي محليًا", () => {
    expect(buildDebtReminderUrl({ phone: "091 234 5678", customerName: "أحمد", remaining: 12.5, storeName: "محل الندى" })).toContain("https://wa.me/218912345678?text=");
    expect(getWeeklySummary([
      { createdAt: "2026-08-20T10:00:00.000Z", total: 10, profit: 3 },
      { createdAt: "2026-08-10T10:00:00.000Z", total: 40, profit: 15 },
    ], new Date("2026-08-23T12:00:00.000Z"))).toMatchObject({ revenue: 10, profit: 3, invoices: 1 });
    expect(getStocktakeDifference(8, 5)).toBe(-3);
  });

  it("يحدد موعد الجرد الأسبوعي ويقارن أسبوعين متتاليين محليًا", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    expect(isWeeklyStocktakeDue({ weekday: 0 }, now)).toBe(true);
    expect(isWeeklyStocktakeDue({ weekday: 0, lastCompletedAt: "2026-08-23T08:00:00.000Z" }, now)).toBe(false);
    expect(getWeekComparison([
      { createdAt: "2026-08-22T10:00:00.000Z", total: 30, profit: 10 },
      { createdAt: "2026-08-15T10:00:00.000Z", total: 20, profit: 6 },
    ], now)).toMatchObject({ revenueChange: 10, profitChange: 4, current: { invoices: 1 }, previous: { invoices: 1 } });
  });

  it("ينشئ ملصقات الرفوف من الأصناف المختارة فقط", () => {
    const html = buildShelfLabelsPrintHtml("محل الاختبار", [{ id: "p1", name: "حليب <طازج>", sku: "SKU-1", salePrice: 4.5 }], (value) => `${value} د.ل`, { p1: "<svg data-barcode=\"SKU-1\"></svg>" }, "large");
    expect(html).toContain("حليب &lt;طازج&gt;");
    expect(html).toContain("4.5 د.ل");
    expect(html).toContain("SKU-1");
    expect(html).toContain("data-barcode");
    expect(html).toContain("كبير 70 × 40 مم");
    expect(html).toContain("minmax(70mm,1fr)");
  });

  it("يرصد الأصناف بلا حركة ويحسب التقرير الشهري من الفواتير المحلية", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    const sales = [{ id: "sale-1", createdAt: "2026-08-20T10:00:00.000Z", total: 30, profit: 10, paymentMethod: "cash" as const, items: [{ productId: "active", name: "نشط", quantity: 2, price: 15, cost: 10 }] }, { id: "sale-2", createdAt: "2026-07-01T10:00:00.000Z", total: 10, profit: 2, paymentMethod: "cash" as const, items: [{ productId: "inactive", name: "راكد", quantity: 1, price: 10, cost: 8 }] }];
    expect(getInactiveProducts([{ id: "active", name: "نشط", sku: "A-1", category: "عام", quantity: 2, purchasePrice: 10, salePrice: 15 }, { id: "inactive", name: "راكد", sku: "B-1", category: "عام", quantity: 3, purchasePrice: 8, salePrice: 10 }], sales, now).map((entry) => entry.product.id)).toEqual(["inactive"]);
    expect(getMonthlyReport(sales, now)).toMatchObject({ invoices: 1, revenue: 30, profit: 10, units: 2 });
    expect(getPrintableBarcodeValue("T-001")).toBe("T-001");
    expect(getPrintableBarcodeValue("رمز عربي")).toBe("");
  });

  it("يرصد الصلاحية وينشئ قائمة مشتريات مجمعة حسب المورد", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    expect(getExpiryStatus("2026-08-20", now).kind).toBe("expired");
    expect(getExpiryStatus("2026-08-30", now).kind).toBe("soon");
    const products = [
      { id: "p1", name: "حليب", sku: "M-1", supplierName: "مورد أ", expiryDate: "2026-08-30", quantity: 1, lowStockAt: 5 },
      { id: "p2", name: "عصير", sku: "J-1", supplierName: "مورد أ", expiryDate: "2026-10-30", quantity: 5, lowStockAt: 3 },
      { id: "p3", name: "أرز", sku: "R-1", quantity: 0, lowStockAt: 4 },
    ];
    expect(getExpiringProducts(products, now).map((entry) => entry.product.id)).toEqual(["p1"]);
    expect(getSupplierPurchaseList(products)).toMatchObject([{ supplierName: "بدون مورد محدد", products: [{ id: "p3", suggestedQuantity: 8 }] }, { supplierName: "مورد أ", products: [{ id: "p1", suggestedQuantity: 9 }] }]);
  });

  it("يستهلك الدفعات بالأقرب صلاحية ويرتب جرد الدفعات", () => {
    const batches = [
      { id: "late", receivedAt: "2026-08-01T10:00:00.000Z", quantity: 5, remainingQuantity: 5, purchasePrice: 3, expiryDate: "2026-10-10", supplierName: "مورد", note: "" },
      { id: "early", receivedAt: "2026-08-02T10:00:00.000Z", quantity: 3, remainingQuantity: 3, purchasePrice: 3, expiryDate: "2026-09-01", supplierName: "مورد", note: "" },
    ];
    const consumed = consumeBatchesFefo(batches, 4);
    expect(consumed.consumedBatchIds).toEqual(["early", "late"]);
    expect(consumed.batches).toMatchObject([{ id: "late", remainingQuantity: 4 }, { id: "early", remainingQuantity: 0 }]);
    expect(getBatchRemainingTotal(consumed.batches)).toBe(4);
    expect(getEarliestActiveExpiry(consumed.batches)).toBe("2026-10-10");
    expect(getExpirySortedBatchInventory([{ id: "p", name: "زيت", sku: "O-1", batches: consumed.batches }])[0]?.batch.id).toBe("late");
    expect(getBatchHistory([{ id: "p", name: "زيت", sku: "O-1", batches: consumed.batches }]).map((entry) => entry.batch.id)).toEqual(["late", "early"]);
    expect(getBatchRemainingTotal(reconcileBatchStocktake(consumed.batches, 6, "2026-08-23T12:00:00.000Z", 3))).toBe(6);
  });

  it("يعدل ويلغي الدفعة غير المستهلكة ويحسب هدر الدفعات المنتهية", () => {
    const batches = [{ id: "editable", receivedAt: "2026-08-01T10:00:00.000Z", quantity: 3, remainingQuantity: 3, purchasePrice: 2, expiryDate: "2026-08-20", supplierName: "مورد", note: "" }, { id: "used", receivedAt: "2026-08-02T10:00:00.000Z", quantity: 3, remainingQuantity: 1, purchasePrice: 4, expiryDate: "2026-10-20", supplierName: "مورد", note: "" }];
    const updated = updateUnconsumedBatch(batches, "editable", { quantity: 4, purchasePrice: 2.5, expiryDate: "2026-08-21", supplierName: "مورد جديد", note: "تصحيح" });
    expect(updated.changed).toBe(true);
    expect(updated.batches.find((batch) => batch.id === "editable")).toMatchObject({ id: "editable", quantity: 4, remainingQuantity: 4, purchasePrice: 2.5 });
    expect(updateUnconsumedBatch(batches, "used", { quantity: 4, purchasePrice: 2, expiryDate: "", supplierName: "", note: "" }).changed).toBe(false);
    expect(cancelUnconsumedBatch(updated.batches, "editable").cancelled?.id).toBe("editable");
    expect(cancelUnconsumedBatch(batches, "used").cancelled).toBeUndefined();
    expect(getExpiryWasteReport([{ id: "p", name: "حليب", sku: "M-1", batches: updated.batches }], new Date("2026-08-23T12:00:00.000Z"))).toMatchObject({ units: 4, cost: 10, entries: [{ batch: { id: "editable" } }] });
  });
});
