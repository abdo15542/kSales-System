import { describe, expect, it } from "vitest";
import { getPrintLayout } from "../client/src/lib/printLayout";

describe("تخطيط طباعة سوقنا", () => {
  it("يضبط إيصال 58 مم للطابعة الحرارية", () => {
    expect(getPrintLayout("58")).toMatchObject({ pageSize: "58mm auto", contentWidth: "58mm", isA4: false });
  });

  it("يضبط إيصال 80 مم للطابعة الحرارية", () => {
    expect(getPrintLayout("80")).toMatchObject({ pageSize: "80mm auto", contentWidth: "80mm", isA4: false });
  });

  it("يضبط ورقة A4 للطابعة العادية", () => {
    expect(getPrintLayout("A4")).toMatchObject({ pageSize: "A4", contentWidth: "190mm", isA4: true });
  });
});
