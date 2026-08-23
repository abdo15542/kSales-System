export type ShelfLabelProduct = { id: string; name: string; sku: string; salePrice: number };

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character] ?? character));

export const buildShelfLabelsPrintHtml = (storeName: string, products: ShelfLabelProduct[], money: (value: number) => string, barcodeSvgs: Record<string, string> = {}) => {
  const labels = products.map((product) => {
    const barcode = barcodeSvgs[product.id] ? `<div style="margin:5px auto 1px;line-height:0">${barcodeSvgs[product.id]}</div>` : "";
    return `<article style="border:1px dashed #173c31;border-radius:7px;padding:7px;text-align:center;break-inside:avoid;background:#fff"><strong style="display:block;font-size:1.1em;margin-bottom:5px">${escapeHtml(product.name)}</strong><span style="display:block;font-size:1.35em;font-weight:700;direction:ltr">${money(product.salePrice)}</span>${barcode}<small style="display:block;color:#617066;margin-top:5px;direction:ltr">${escapeHtml(product.sku || "بدون باركود")}</small></article>`;
  }).join("");
  return `<h1>ملصقات أسعار الرفوف</h1><p>${escapeHtml(storeName)} · اختر المقاس والطابعة من نافذة النظام</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(42mm,1fr));gap:7px;margin-top:10px">${labels}</div>`;
};
