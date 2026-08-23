export type PrintPaperSize = "58" | "80" | "A4";

export type PrintLayout = {
  pageSize: string;
  contentWidth: string;
  padding: string;
  fontSize: string;
  isA4: boolean;
};

/** يضمن إخراجًا مناسبًا لإيصالات الطابعات الحرارية والطابعات العادية. */
export function getPrintLayout(paperSize: PrintPaperSize): PrintLayout {
  const isA4 = paperSize === "A4";
  return {
    pageSize: isA4 ? "A4" : `${paperSize}mm auto`,
    contentWidth: isA4 ? "190mm" : `${paperSize}mm`,
    padding: isA4 ? "12mm" : "7px",
    fontSize: isA4 ? "14px" : "11px",
    isA4,
  };
}
