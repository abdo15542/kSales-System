export type ReceiptPdfInput = {
  storeName: string;
  storePhone?: string;
  invoiceNumber: string;
  createdAt: string;
  paymentLabel: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal?: number;
  discountAmount?: number;
  note?: string;
  orderReference?: string;
  total: number;
};

const amount = (value: number) => `${value.toFixed(2)} د.ل`;

export const buildReceiptPdfLines = (input: ReceiptPdfInput) => [
  input.storeName,
  input.storePhone ? `هاتف: ${input.storePhone}` : "",
  `فاتورة رقم ${input.invoiceNumber}`,
  ...(input.orderReference ? [`مرجع الطلب: ${input.orderReference}`] : []),
  `التاريخ: ${input.createdAt}`,
  "--------------------------------",
  ...input.items.flatMap((item) => [item.name, `${item.quantity} × ${amount(item.price)} = ${amount(item.quantity * item.price)}`]),
  "--------------------------------",
  ...(input.subtotal === undefined ? [] : [`المجموع: ${amount(input.subtotal)}`]),
  ...(input.discountAmount ? [`الخصم: -${amount(input.discountAmount)}`] : []),
  `الإجمالي: ${amount(input.total)}`,
  `الدفع: ${input.paymentLabel}`,
  ...(input.note ? [`ملاحظة: ${input.note}`] : []),
  "شكرًا لتسوقكم معنا",
].filter(Boolean);
