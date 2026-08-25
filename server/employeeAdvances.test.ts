import { describe, expect, it } from "vitest";
import { filterEmployeeAdvances, getAdvanceOutstanding, getEmployeeAdvanceTotal, isValidPayrollMonth, type EmployeeAdvance } from "../client/src/lib/employeeAdvances";

const advances: EmployeeAdvance[] = [
  { id: "a1", staffMemberId: "s1", staffMemberName: "أحمد", type: "cash", description: "سلفة أسبوعية", amount: 100, month: "2026-08", createdAt: "2026-08-01T10:00:00.000Z", settled: 20, note: "" },
  { id: "a2", staffMemberId: "s1", staffMemberName: "أحمد", type: "goods", description: "بضاعة", amount: 55, quantity: 2, productId: "p1", productName: "ماء", month: "2026-08", createdAt: "2026-08-02T10:00:00.000Z", settled: 0, note: "" },
  { id: "a3", staffMemberId: "s2", staffMemberName: "سالم", type: "clothing", description: "ملابس عمل", amount: 80, month: "2026-08", createdAt: "2026-08-03T10:00:00.000Z", settled: 0, note: "" },
  { id: "a4", staffMemberId: "s1", staffMemberName: "أحمد", type: "cash", description: "سلفة قديمة", amount: 40, month: "2026-07", createdAt: "2026-07-01T10:00:00.000Z", settled: 0, note: "" },
];

describe("employee advances", () => {
  it("calculates only the outstanding balance", () => {
    expect(getAdvanceOutstanding(advances[0])).toBe(80);
    expect(getEmployeeAdvanceTotal(advances, "s1", "2026-08")).toBe(135);
  });

  it("filters by month and Arabic search text", () => {
    expect(filterEmployeeAdvances(advances, "ماء", "2026-08").map((advance) => advance.id)).toEqual(["a2"]);
    expect(filterEmployeeAdvances(advances, "أحمد", "2026-07").map((advance) => advance.id)).toEqual(["a4"]);
  });

  it("accepts the standardized month value from mobile month inputs", () => {
    expect(isValidPayrollMonth("2026-08")).toBe(true);
    expect(isValidPayrollMonth("أغسطس 2026")).toBe(false);
  });
});
