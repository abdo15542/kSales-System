import { describe, expect, it } from "vitest";
import { getNearDepletionProducts, getRecurringCustomers, isBackupDueToday, isLocalProductImage } from "../client/src/lib/operationalHelpers";
import { buildReceiptQrMarkup, buildReceiptQrPayload, makeReceiptQrDataUrl } from "../client/src/lib/receiptQr";
import { buildReceiptPrintHtml } from "../client/src/lib/receiptTemplate";
import { buildPriceChangeDrafts, isSettledDebt } from "../client/src/lib/storeHistory";
import { buildReceiptPdfLines } from "../client/src/lib/receiptPdf";
import { buildDebtReminderUrl, getStocktakeDifference, getWeeklySummary } from "../client/src/lib/weeklyOperations";
import { getWeekComparison, isWeeklyStocktakeDue } from "../client/src/lib/weeklyPlanning";
import { buildShelfLabelsPrintHtml } from "../client/src/lib/shelfLabels";

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
    const html = buildShelfLabelsPrintHtml("محل الاختبار", [{ id: "p1", name: "حليب <طازج>", sku: "SKU-1", salePrice: 4.5 }], (value) => `${value} د.ل`);
    expect(html).toContain("حليب &lt;طازج&gt;");
    expect(html).toContain("4.5 د.ل");
    expect(html).toContain("SKU-1");
  });
});
