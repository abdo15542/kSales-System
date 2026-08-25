export type AppVersion = { version: string; timestamp?: number };

export const getUpdateStatus = (runningVersion: string | null, remoteVersion: string | null) => {
  if (!remoteVersion) return "unavailable" as const;
  if (!runningVersion) return "first-check" as const;
  return runningVersion === remoteVersion ? "current" as const : "available" as const;
};

export const fetchPublishedAppVersion = async () => {
  const response = await fetch(`/__manus__/version.json?checkedAt=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("تعذر الوصول إلى ملف النسخة.");
  const data = await response.json() as Partial<AppVersion>;
  return typeof data.version === "string" && data.version ? { version: data.version, timestamp: typeof data.timestamp === "number" ? data.timestamp : undefined } : null;
};
