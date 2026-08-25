export type PaymentMethod = "cash" | "card" | "transfer" | "credit";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقدًا",
  card: "بطاقة مصرفية",
  transfer: "تحويل مصرفي",
  credit: "آجل / ذمة",
};

export const getPaymentMethodLabel = (paymentMethod: PaymentMethod | string | undefined): string => {
  if (paymentMethod === "cash" || paymentMethod === "card" || paymentMethod === "transfer" || paymentMethod === "credit") {
    return PAYMENT_METHOD_LABELS[paymentMethod];
  }
  return "غير محدد";
};

export const isCreditPayment = (paymentMethod: PaymentMethod | string | undefined): boolean => paymentMethod === "credit";
