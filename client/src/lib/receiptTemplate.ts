export type ReceiptTemplateParts = {
  brandHtml: string;
  invoiceHtml: string;
  rowsHtml: string;
  subtotalHtml: string;
  discountHtml: string;
  totalHtml: string;
  qrHtml: string;
  footerHtml: string;
};

export const buildReceiptPrintHtml = ({
  brandHtml,
  invoiceHtml,
  rowsHtml,
  subtotalHtml,
  discountHtml,
  totalHtml,
  qrHtml,
  footerHtml,
}: ReceiptTemplateParts) => `${brandHtml}${invoiceHtml}<table><thead><tr><th>الصنف</th><th>الكمية</th><th>الإجمالي</th></tr></thead><tbody>${rowsHtml}</tbody></table>${subtotalHtml}${discountHtml}${totalHtml}${qrHtml}${footerHtml}`;
