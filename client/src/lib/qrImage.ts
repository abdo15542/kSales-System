type DetectorResult = { rawValue?: string };
type DetectorInstance = { detect: (source: ImageBitmapSource) => Promise<DetectorResult[]> };
type DetectorConstructor = new (options?: { formats?: string[] }) => DetectorInstance;

declare global { interface Window { BarcodeDetector?: DetectorConstructor; } }

export const readQrCodeFromImage = async (file: File) => {
  if (!window.BarcodeDetector || !window.createImageBitmap) throw new Error("قراءة QR من صورة غير مدعومة في هذا المتصفح. استخدم Chrome حديثًا أو الصق الرمز يدويًا.");
  const bitmap = await createImageBitmap(file);
  try {
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const result = (await detector.detect(bitmap)).find((entry) => entry.rawValue?.trim())?.rawValue?.trim();
    if (!result) throw new Error("لم نعثر على رمز QR واضح في الصورة.");
    return result;
  } finally {
    bitmap.close();
  }
};
