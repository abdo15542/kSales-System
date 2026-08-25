import { describe, expect, it } from "vitest";
import { activateDevice, createActivationPayload, createDeviceRequest, decodeLocalAccessCode, encodeLocalAccessCode, isAccessExpired, verifyLocalAccessLogin } from "../client/src/lib/localAccess";

describe("local device access", () => {
  it("binds an activation payload to the requesting device only", async () => {
    const first = await createDeviceRequest("device-a");
    const second = await createDeviceRequest("device-b");
    const payload = await createActivationPayload(first.request, "cashier", "secret123", "2030-01-01T00:00:00.000Z");
    expect(activateDevice(payload, first.deviceId, first.request.deviceProof)?.username).toBe("cashier");
    expect(activateDevice(payload, second.deviceId, second.request.deviceProof)).toBeNull();
  });

  it("round-trips manual codes and verifies credentials before expiry", async () => {
    const target = await createDeviceRequest("device-c");
    const payload = await createActivationPayload(target.request, "worker", "pass1234", "2030-01-01T00:00:00.000Z");
    const restored = decodeLocalAccessCode(encodeLocalAccessCode(payload));
    const profile = restored && activateDevice(restored, target.deviceId, target.request.deviceProof);
    expect(profile && await verifyLocalAccessLogin(profile, "worker", "pass1234")).toBe(true);
    expect(profile && await verifyLocalAccessLogin(profile, "worker", "wrong")).toBe(false);
    expect(isAccessExpired({ expiresAt: "2000-01-01T00:00:00.000Z" })).toBe(true);
  });
});
