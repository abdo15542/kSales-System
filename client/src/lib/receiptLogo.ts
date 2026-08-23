const imageDataUrlPattern = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i;

export type ReceiptLogoSizing = {
  maxWidthMm: number;
  maxHeightMm: number;
  objectFit: "contain";
};

export const isReceiptLogoDataUrl = (value: unknown): value is string =>
  typeof value === "string" && imageDataUrlPattern.test(value);

export const getReceiptLogoSource = (logo: unknown, fallback: string) =>
  isReceiptLogoDataUrl(logo) ? logo : fallback;

/** يحافظ على الشعار المربع أو العريض كاملًا داخل مساحة صغيرة قابلة للطباعة. */
export const getReceiptLogoSizing = (paperWidth: "58" | "80" | "A4"): ReceiptLogoSizing => {
  if (paperWidth === "58") return { maxWidthMm: 30, maxHeightMm: 16, objectFit: "contain" };
  if (paperWidth === "80") return { maxWidthMm: 42, maxHeightMm: 16, objectFit: "contain" };
  return { maxWidthMm: 42, maxHeightMm: 20, objectFit: "contain" };
};
