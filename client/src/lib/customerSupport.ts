export const LOCAL_SUPPORT_VISIBILITY_KEY = "souqna-support-button-visible-v1";
export const SUPPORT_VISIBILITY_EVENT = "souqna-support-visibility-changed";
export const LOCAL_SUPPORT_REQUESTS_KEY = "souqna-support-requests-v1";

export type SupportCategory = "technical" | "printing" | "barcode" | "activation" | "other";

export type SupportRequest = {
  id: string;
  createdAt: string;
  category: SupportCategory;
  details: string;
  deviceId: string;
  role: "owner" | "user" | null;
};

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  technical: "مشكلة تشغيل",
  printing: "طباعة",
  barcode: "باركود أو كاميرا",
  activation: "تفعيل جهاز",
  other: "أخرى",
};

export const isSupportButtonVisible = (raw: string | null) => raw !== "hidden";

export const getSupportMessage = (role: "owner" | "user" | null) => role === "owner"
  ? "مرحبًا، أنا مالك نظام سوقنا وأحتاج مساعدة من خدمة العملاء."
  : "مرحبًا، أحتاج مساعدة في استخدام نظام سوقنا.";

export const buildSupportRequestMessage = (request: SupportRequest) => [
  getSupportMessage(request.role),
  "",
  `نوع البلاغ: ${SUPPORT_CATEGORY_LABELS[request.category]}`,
  `التفاصيل: ${request.details.trim()}`,
  `معرّف الجهاز: ${request.deviceId}`,
  `رقم البلاغ المحلي: ${request.id}`,
].join("\n");

export const parseSupportRequests = (raw: string | null): SupportRequest[] => {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is SupportRequest => Boolean(item && typeof item.id === "string" && typeof item.createdAt === "string" && typeof item.details === "string" && typeof item.deviceId === "string" && item.category in SUPPORT_CATEGORY_LABELS)).slice(0, 25) : [];
  } catch { return []; }
};
