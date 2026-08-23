export type ShelfLabelProduct = { id: string; name: string; sku: string; salePrice: number };
export type LabelSize = "compact" | "standard" | "large";

export const labelSizePresets: Record<LabelSize, { label: string; widthMm: number; minHeightMm: number; priceSize: string; barcodeHeightMm: number }> = {
  compact: { label: "صغير 38 × 25 مم", widthMm: 38, minHeightMm: 25, priceSize: "1.05em", barcodeHeightMm: 7 },
  standard: { label: "قياسي 50 × 30 مم", widthMm: 50, minHeightMm: 30, priceSize: "1.35em", barcodeHeightMm: 9 },
  large: { label: "كبير 70 × 40 مم", widthMm: 70, minHeightMm: 40, priceSize: "1.65em", barcodeHeightMm: 12 },
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character] ?? character));

export const buildShelfLabelsPrintHtml = (storeName: string, products: ShelfLabelProduct[], money: (value: number) => string, barcodeSvgs: Record<string, string> = {}, labelSize: LabelSize = "standard") => {
  const preset = labelSizePresets[labelSize];
  const labels = products.map((product) => {
    const barcode = barcodeSvgs[product.id] ? `<div style="margin:4px auto 1px;line-height:0;max-height:${preset.barcodeHeightMm}mm;overflow:hidden">${barcodeSvgs[product.id]}</div>` : "";
    return `<article style="border:1px dashed #173c31;border-radius:7px;padding:5px;text-align:center;break-inside:avoid;background:#fff;min-height:${preset.minHeightMm}mm"><strong style="display:block;font-size:1.02em;margin-bottom:3px">${escapeHtml(product.name)}</strong><span style="display:block;font-size:${preset.priceSize};font-weight:700;direction:ltr">${money(product.salePrice)}</span>${barcode}<small style="display:block;color:#617066;margin-top:3px;direction:ltr">${escapeHtml(product.sku || "بدون باركود")}</small></article>`;
  }).join("");
  return `<h1>ملصقات أسعار الرفوف</h1><p>${escapeHtml(storeName)} · ${preset.label} · اختر الطابعة من نافذة النظام</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(${preset.widthMm}mm,1fr));gap:5px;margin-top:8px">${labels}</div>`;
};
