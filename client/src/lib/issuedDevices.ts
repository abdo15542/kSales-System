export type IssuedDeviceRecord = {
  deviceId: string;
  deviceProof: string;
  username: string;
  expiresAt: string;
  issuedAt: string;
};

export const upsertIssuedDevice = (records: IssuedDeviceRecord[], next: IssuedDeviceRecord) => [next, ...records.filter((record) => record.deviceId !== next.deviceId)];

export const getIssuedDeviceStatus = (record: IssuedDeviceRecord, now = Date.now()) => new Date(record.expiresAt).getTime() <= now ? "expired" as const : "active" as const;
