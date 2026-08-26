export const LOCAL_SUPPORT_VISIBILITY_KEY = "souqna-support-button-visible-v1";
export const SUPPORT_VISIBILITY_EVENT = "souqna-support-visibility-changed";

export const isSupportButtonVisible = (raw: string | null) => raw !== "hidden";

export const getSupportMessage = (role: "owner" | "user" | null) => role === "owner"
  ? "مرحبًا، أنا مالك نظام سوقنا وأحتاج مساعدة من خدمة العملاء."
  : "مرحبًا، أحتاج مساعدة في استخدام نظام سوقنا.";
