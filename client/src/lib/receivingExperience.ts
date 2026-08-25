import type { BarcodeFeedbackKind } from "./barcodeFeedback";

export type ReceivingSessionEventKind = BarcodeFeedbackKind | "received";

export type ReceivingSessionEvent = {
  id: string;
  kind: ReceivingSessionEventKind;
  barcode: string;
  productName: string;
  createdAt: string;
  quantity?: number;
};

export type SuccessfulReceivingScan = {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  scannedAt: string;
};

export const appendReceivingSessionEvent = (
  current: ReceivingSessionEvent[],
  next: ReceivingSessionEvent,
  maximumEntries = 12,
) => [next, ...current].slice(0, Math.max(1, maximumEntries));

export const getSuccessfulReceivingSessionEvents = (entries: ReceivingSessionEvent[], limit = 5) => entries.filter((entry) => entry.kind === "success").slice(0, Math.max(0, limit));

export const appendSuccessfulReceivingScan = (entries: SuccessfulReceivingScan[], scan: SuccessfulReceivingScan, limit = 240) => [scan, ...entries].slice(0, Math.max(1, limit));

export const getDailySuccessfulReceivingScans = (entries: SuccessfulReceivingScan[], dayKey: string) => entries.filter((entry) => entry.scannedAt.slice(0, 10) === dayKey);

export const filterSuccessfulReceivingScans = (entries: SuccessfulReceivingScan[], query: string) => {
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");
  return normalizedQuery ? entries.filter((entry) => `${entry.productName} ${entry.barcode}`.toLocaleLowerCase("ar").includes(normalizedQuery)) : entries;
};

export const adjustReceivingQuantity = (value: string | number, change: number) => {
  const parsed = Number(value);
  const current = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
  return Math.min(99_999, Math.max(1, current + Math.floor(change)));
};

const escapeLabelHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character] ?? character));

export const buildReceivingBarcodeLabelHtml = ({
  storeName,
  productName,
  barcode,
  price,
  barcodeSvg,
}: {
  storeName: string;
  productName: string;
  barcode: string;
  price: string;
  barcodeSvg: string;
}) => `<section class="receiving-barcode-label" dir="rtl">
  <strong>${escapeLabelHtml(storeName)}</strong>
  <h1>${escapeLabelHtml(productName)}</h1>
  <div class="receiving-barcode-label__code" dir="ltr">${barcodeSvg}</div>
  <p dir="ltr">${escapeLabelHtml(barcode)}</p>
  <b>${escapeLabelHtml(price)}</b>
</section>
<style>
  .receiving-barcode-label{width:58mm;min-height:32mm;margin:0 auto;padding:3mm;text-align:center;color:#173c31;border:1px solid #173c31;font-family:Arial,"Noto Sans Arabic",sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm}
  .receiving-barcode-label strong{font-size:9px}.receiving-barcode-label h1{font-size:13px;margin:0;line-height:1.2}.receiving-barcode-label__code svg{width:46mm;height:14mm;display:block}.receiving-barcode-label p{font-size:9px;margin:0;letter-spacing:.4px}.receiving-barcode-label b{font-size:12px}@media print{.receiving-barcode-label{break-inside:avoid}}
</style>`;
