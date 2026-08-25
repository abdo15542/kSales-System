export type UsbBarcodeScan = {
  value: string;
  elapsedMs: number;
};

/**
 * قارئات USB المتوافقة مع وضع لوحة المفاتيح ترسل الباركود سريعًا ثم زر Enter.
 * نرفض النص القصير أو البطيء حتى لا تتحول الكتابة العادية إلى عملية بيع.
 */
export const getUsbBarcodeValue = ({ value, elapsedMs }: UsbBarcodeScan) => {
  const barcode = value.replace(/\s/g, "").trim();
  if (barcode.length < 4 || elapsedMs > 1500) return "";
  return barcode;
};
