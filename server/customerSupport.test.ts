import { describe, expect, it } from "vitest";
import { buildSupportRequestMessage, getSupportMessage, isSupportButtonVisible, parseSupportRequests, type SupportRequest } from "../client/src/lib/customerSupport";

describe("customer support settings", () => {
  it("shows support unless the device explicitly hides it", () => {
    expect(isSupportButtonVisible(null)).toBe(true);
    expect(isSupportButtonVisible("hidden")).toBe(false);
  });

  it("uses a useful support context for the owner", () => {
    expect(getSupportMessage("owner")).toContain("مالك");
    expect(getSupportMessage("user")).toContain("مساعدة");
  });

  it("builds an organized message that includes the support details and device id", () => {
    const request: SupportRequest = { id: "SUP-1", createdAt: "2026-08-26T09:00:00.000Z", category: "printing", details: "الإيصال لا يظهر", deviceId: "device-123", role: "owner" };
    const message = buildSupportRequestMessage(request);
    expect(message).toContain("طباعة");
    expect(message).toContain("device-123");
    expect(message).toContain("SUP-1");
  });

  it("keeps only valid local support requests", () => {
    expect(parseSupportRequests('[{"id":"SUP-1","createdAt":"2026-08-26T09:00:00.000Z","category":"technical","details":"توقف","deviceId":"device-123","role":"user"},{"id":2}]')).toHaveLength(1);
  });
});
