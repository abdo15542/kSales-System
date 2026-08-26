import { describe, expect, it } from "vitest";
import { DEFAULT_CASHIER_SETTINGS, matchesCashierShortcut, parseCashierSettings, updateCashierShortcut } from "../client/src/lib/cashierSettings";

describe("cashier settings", () => {
  it("uses safe defaults for missing or invalid saved settings", () => {
    expect(parseCashierSettings(null)).toEqual(DEFAULT_CASHIER_SETTINGS);
    expect(parseCashierSettings("not-json")).toEqual(DEFAULT_CASHIER_SETTINGS);
  });

  it("keeps only valid unique shortcuts from local settings", () => {
    const settings = parseCashierSettings('{"fontScale":"large","shortcuts":{"focus-search":"F3","open-scanner":"F3","confirm-sale":"Alt+Enter"}}');
    expect(settings.fontScale).toBe("large");
    expect(settings.shortcuts["focus-search"]).toBe("F3");
    expect(settings.shortcuts["open-scanner"]).toBe("Alt+B");
    expect(settings.shortcuts["confirm-sale"]).toBe("Alt+Enter");
  });

  it("clears an existing action when its shortcut is reassigned", () => {
    const next = updateCashierShortcut(DEFAULT_CASHIER_SETTINGS, "open-scanner", "F2");
    expect(next.shortcuts["open-scanner"]).toBe("F2");
    expect(next.shortcuts["focus-search"]).toBe("none");
  });

  it("matches function and modifier shortcuts without matching plain typing", () => {
    expect(matchesCashierShortcut({ key: "F2", altKey: false, ctrlKey: false, metaKey: false }, "F2")).toBe(true);
    expect(matchesCashierShortcut({ key: "b", altKey: true, ctrlKey: false, metaKey: false }, "Alt+B")).toBe(true);
    expect(matchesCashierShortcut({ key: "b", altKey: false, ctrlKey: false, metaKey: false }, "Alt+B")).toBe(false);
  });
});
