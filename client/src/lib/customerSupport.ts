export const LOCAL_SUPPORT_VISIBILITY_KEY = "souqna-support-button-visible-v1";
export const SUPPORT_VISIBILITY_EVENT = "souqna-support-visibility-changed";
export const LOCAL_SUPPORT_REQUESTS_KEY = "souqna-support-requests-v1";

export type SupportCategory = "technical" | "printing" | "barcode" | "activation" | "other";
export type SupportRequestStatus = "prepared" | "followUp" | "resolved";

export type SupportRequest = {
  id: string;
  createdAt: string;
  category: SupportCategory;
  details: string;
  deviceId: string;
  role: "owner" | "user" | null;
  status: SupportRequestStatus;
  screenshotDataUrl?: string;
};

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  technical: "مشكلة تشغيل",
  printing: "طباعة",
  barcode: "باركود أو كاميرا",
  activation: "تفعيل جهاز",
  other: "أخرى",
};

export const SUPPORT_STATUS_LABELS: Record<SupportRequestStatus, string> = {
  prepared: "مجهز للمراسلة",
  followUp: "قيد المتابعة",
  resolved: "تم الحل",
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
  request.screenshotDataUrl ? "صورة الخطأ محفوظة محليًا على هذا الجهاز." : "",
  `الحالة: ${SUPPORT_STATUS_LABELS[request.status]}`,
].join("\n");

export const keepSupportRequests = (requests: SupportRequest[]) => requests.slice(0, 25).map((request, index) => index < 4 ? request : { ...request, screenshotDataUrl: undefined });

export const parseSupportRequests = (raw: string | null): SupportRequest[] => {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? keepSupportRequests(parsed.filter((item): item is Omit<SupportRequest, "status"> & { status?: SupportRequestStatus } => Boolean(item && typeof item.id === "string" && typeof item.createdAt === "string" && typeof item.details === "string" && typeof item.deviceId === "string" && item.category in SUPPORT_CATEGORY_LABELS)).map((item): SupportRequest => ({ ...item, status: typeof item.status === "string" && item.status in SUPPORT_STATUS_LABELS ? item.status : "prepared", screenshotDataUrl: typeof item.screenshotDataUrl === "string" && /^data:image\/(png|jpe?g|webp);base64,/i.test(item.screenshotDataUrl) ? item.screenshotDataUrl : undefined }))) : [];
  } catch { return []; }
};
