import JsBarcode from "jsbarcode";

export const getPrintableBarcodeValue = (sku: string) => {
  const value = sku.trim();
  return /^[\x20-\x7E]{1,80}$/.test(value) ? value : "";
};

export const createCode128Svg = (value: string) => {
  if (!value || typeof document === "undefined") return "";
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value, { format: "CODE128", displayValue: false, margin: 0, width: 1.25, height: 30 });
    return svg.outerHTML;
  } catch {
    return "";
  }
};
