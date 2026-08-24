export type ExternalBarcodeBuffer = {
  value: string;
  lastKeyAt: number;
};

export type ExternalBarcodeCapture = {
  buffer: ExternalBarcodeBuffer;
  barcode?: string;
};

const emptyBuffer = (): ExternalBarcodeBuffer => ({ value: "", lastKeyAt: 0 });

export const captureExternalBarcodeKey = (previous: ExternalBarcodeBuffer, key: string, occurredAt: number, resetAfterMs = 250): ExternalBarcodeCapture => {
  if (key === "Enter") {
    const barcode = previous.value.trim();
    return { buffer: emptyBuffer(), ...(barcode.length >= 3 ? { barcode } : {}) };
  }
  if (key.length !== 1 || /\s/.test(key)) return { buffer: previous };
  const expired = !previous.value || occurredAt - previous.lastKeyAt > resetAfterMs;
  return { buffer: { value: `${expired ? "" : previous.value}${key}`, lastKeyAt: occurredAt } };
};
