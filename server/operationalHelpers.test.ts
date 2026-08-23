import { describe, expect, it } from "vitest";
import { getNearDepletionProducts, getRecurringCustomers, isBackupDueToday, isLocalProductImage } from "../client/src/lib/operationalHelpers";
import { buildReceiptQrMarkup, buildReceiptQrPayload, makeReceiptQrDataUrl } from "../client/src/lib/receiptQr";
import { buildReceiptPrintHtml } from "../client/src/lib/receiptTemplate";

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
});
