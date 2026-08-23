import { describe, expect, it } from "vitest";
import { getRecurringCustomers, isBackupDueToday, isLocalProductImage } from "../client/src/lib/operationalHelpers";

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
});
