import QRCode from "qrcode";

export type ReceiptQrSource = {
  id: string;
  createdAt: string;
  total: number;
  paymentMethod: "cash" | "card" | "transfer" | "credit";
};

export const buildReceiptQrPayload = (sale: ReceiptQrSource, storeName: string, storePhone = "") => JSON.stringify({
  s: storeName.trim(),
  p: storePhone.trim() || undefined,
  i: sale.id.slice(-8),
  d: sale.createdAt.slice(0, 16),
  t: Number(sale.total.toFixed(2)),
  m: sale.paymentMethod,
});

export const makeReceiptQrDataUrl = (payload: string) => QRCode.toDataURL(payload, {
  errorCorrectionLevel: "L",
  margin: 2,
  width: 320,
  color: { dark: "#000000", light: "#ffffff" },
});

export const buildReceiptQrMarkup = (dataUrl: string, caption = "امسح لعرض ملخص الفاتورة") => dataUrl
  ? `<div class="receipt-qr"><img src="${dataUrl}" alt="رمز QR للفاتورة" /><small>${caption}</small></div>`
  : "";
