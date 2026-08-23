import QRCode from "qrcode";

export type ReceiptQrSource = {
  id: string;
  createdAt: string;
  total: number;
  paymentMethod: "cash" | "credit";
};

export const buildReceiptQrPayload = (sale: ReceiptQrSource, storeName: string, storePhone = "") => JSON.stringify({
  app: "souqna",
  store: storeName.trim(),
  phone: storePhone.trim() || undefined,
  invoice: sale.id.slice(-8),
  issuedAt: sale.createdAt,
  total: Number(sale.total.toFixed(2)),
  payment: sale.paymentMethod === "cash" ? "cash" : "credit",
});

export const makeReceiptQrDataUrl = (payload: string) => QRCode.toDataURL(payload, {
  errorCorrectionLevel: "M",
  margin: 1,
  width: 220,
  color: { dark: "#183d2d", light: "#fffdf8" },
});

export const buildReceiptQrMarkup = (dataUrl: string) => dataUrl
  ? `<div class="receipt-qr"><img src="${dataUrl}" alt="رمز QR للفاتورة" /><small>امسح لعرض ملخص الفاتورة</small></div>`
  : "";
