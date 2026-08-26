export type DeviceActivityAction = "issued" | "renewed" | "deactivation_issued" | "record_deleted";

export type DeviceActivityRecord = {
  id: string;
  deviceId: string;
  username: string;
  action: DeviceActivityAction;
  createdAt: string;
  note?: string;
};

export const getDeviceActivityLabel = (action: DeviceActivityAction) => action === "issued" ? "إصدار تفعيل" : action === "renewed" ? "تجديد تفعيل" : action === "deactivation_issued" ? "إصدار رمز تعطيل" : "حذف من سجل المالك";

export const addDeviceActivity = (records: DeviceActivityRecord[], next: Omit<DeviceActivityRecord, "id" | "createdAt"> & Partial<Pick<DeviceActivityRecord, "id" | "createdAt">>) => [{
  id: next.id || `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: next.createdAt || new Date().toISOString(),
  ...next,
}, ...records].slice(0, 200);

export const searchDeviceRecords = <T extends { deviceId: string; username: string }>(records: T[], query: string) => {
  const normalized = query.trim().toLocaleLowerCase("ar-LY");
  if (!normalized) return records;
  return records.filter((record) => record.username.toLocaleLowerCase("ar-LY").includes(normalized) || record.deviceId.toLocaleLowerCase("ar-LY").includes(normalized));
};
