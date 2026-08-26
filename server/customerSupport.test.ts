import { describe, expect, it } from "vitest";
import { getSupportMessage, isSupportButtonVisible } from "../client/src/lib/customerSupport";

describe("customer support settings", () => {
  it("shows support unless the device explicitly hides it", () => {
    expect(isSupportButtonVisible(null)).toBe(true);
    expect(isSupportButtonVisible("hidden")).toBe(false);
  });

  it("uses a useful support context for the owner", () => {
    expect(getSupportMessage("owner")).toContain("مالك");
    expect(getSupportMessage("user")).toContain("مساعدة");
  });
});
