export type InvoiceTableScale = "normal" | "large" | "extra-large";
export type InvoiceTableColumn = "package" | "unit-price" | "total";

export type InvoiceTableSettings = {
  scale: InvoiceTableScale;
  focusMode: boolean;
  columns: Record<InvoiceTableColumn, boolean>;
};

export const LOCAL_INVOICE_TABLE_SETTINGS_KEY = "souqna-invoice-table-settings-v1";

export const INVOICE_TABLE_SCALE_LABELS: Record<InvoiceTableScale, string> = {
  normal: "عادي",
  large: "كبير",
  "extra-large": "كبير جدًا",
};

export const INVOICE_TABLE_COLUMN_LABELS: Record<InvoiceTableColumn, string> = {
  package: "العبوة / الكود",
  "unit-price": "سعر البيع",
  total: "المجموع",
};

export const DEFAULT_INVOICE_TABLE_SETTINGS: InvoiceTableSettings = {
  scale: "large",
  focusMode: false,
  columns: { package: true, "unit-price": true, total: true },
};

const validScales = new Set<InvoiceTableScale>(["normal", "large", "extra-large"]);
const validColumns = Object.keys(INVOICE_TABLE_COLUMN_LABELS) as InvoiceTableColumn[];

export function normalizeInvoiceTableSettings(value: unknown): InvoiceTableSettings {
  if (!value || typeof value !== "object") return DEFAULT_INVOICE_TABLE_SETTINGS;
  const candidate = value as Partial<InvoiceTableSettings>;
  const scale = candidate.scale && validScales.has(candidate.scale) ? candidate.scale : DEFAULT_INVOICE_TABLE_SETTINGS.scale;
  const columns = { ...DEFAULT_INVOICE_TABLE_SETTINGS.columns };
  if (candidate.columns && typeof candidate.columns === "object") {
    validColumns.forEach((column) => {
      if (typeof candidate.columns?.[column] === "boolean") columns[column] = candidate.columns[column];
    });
  }
  return { scale, focusMode: Boolean(candidate.focusMode), columns };
}

export function parseInvoiceTableSettings(raw: string | null): InvoiceTableSettings {
  if (!raw) return DEFAULT_INVOICE_TABLE_SETTINGS;
  try { return normalizeInvoiceTableSettings(JSON.parse(raw)); } catch { return DEFAULT_INVOICE_TABLE_SETTINGS; }
}

export function cycleInvoiceTableScale(scale: InvoiceTableScale, direction: "increase" | "decrease"): InvoiceTableScale {
  const order: InvoiceTableScale[] = ["normal", "large", "extra-large"];
  const index = order.indexOf(scale);
  return order[Math.max(0, Math.min(order.length - 1, index + (direction === "increase" ? 1 : -1)))];
}
