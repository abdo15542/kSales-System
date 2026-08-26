export type IssuedDeviceRecord = {
  deviceId: string;
  deviceProof: string;
  username: string;
  expiresAt: string;
  issuedAt: string;
  deactivationIssuedAt?: string;
  deactivationReason?: string;
};

export const upsertIssuedDevice = (records: IssuedDeviceRecord[], next: IssuedDeviceRecord) => [next, ...records.filter((record) => record.deviceId !== next.deviceId)];

export const getIssuedDeviceStatus = (record: IssuedDeviceRecord, now = Date.now()) => new Date(record.expiresAt).getTime() <= now ? "expired" as const : "active" as const;

export type IssuedDeviceVisualState = "active" | "near" | "warning" | "urgent" | "expired";

export const getIssuedDeviceVisualState = (record: IssuedDeviceRecord, now = Date.now()): { state: IssuedDeviceVisualState; daysRemaining: number } => {
  const remainingMs = new Date(record.expiresAt).getTime() - now;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return { state: "expired", daysRemaining: 0 };
  const daysRemaining = Math.ceil(remainingMs / 86_400_000);
  if (daysRemaining <= 1) return { state: "urgent", daysRemaining };
  if (daysRemaining <= 3) return { state: "warning", daysRemaining };
  if (daysRemaining <= 7) return { state: "near", daysRemaining };
  return { state: "active", daysRemaining };
};
