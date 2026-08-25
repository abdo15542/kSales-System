export type ThermalReceiptAppearance = {
  textSize?: "small" | "normal" | "large";
  clarity?: "standard" | "high" | "maximum";
};

export const getThermalReceiptStyleOverrides = (isA4: boolean, appearance: ThermalReceiptAppearance = {}) => {
  if (isA4) return "";
  const textSize = appearance.textSize ?? "normal";
  const clarity = appearance.clarity ?? "high";
  const bodySize = { small: "12px", normal: "14px", large: "16px" }[textSize];
  const tableSize = { small: "12px", normal: "14px", large: "15px" }[textSize];
  const settings = clarity === "maximum"
    ? { weight: 900, rowRule: "3px", headerRule: "4px", totalRule: "5px" }
    : clarity === "high"
      ? { weight: 800, rowRule: "2px", headerRule: "3px", totalRule: "4px" }
      : { weight: 700, rowRule: "1px", headerRule: "2px", totalRule: "3px" };
  return `<style>
    body{color:#000!important;background:#fff!important;font-family:Arial,sans-serif!important;font-size:${bodySize}!important;font-weight:${settings.weight}!important;line-height:1.5!important}
    .receipt-brand img{display:none!important}
    .receipt-brand{margin-bottom:7px!important}
    h1{color:#000!important;font-size:${textSize === "large" ? "23px" : textSize === "small" ? "19px" : "21px"}!important;font-weight:900!important;letter-spacing:0!important}
    p,.foot,th{color:#000!important;font-weight:${settings.weight}!important}
    p{margin:5px 0 10px!important}
    th{border-bottom:${settings.headerRule} solid #000!important;padding:7px 0!important;font-size:${tableSize}!important}
    td{color:#000!important;border-bottom:${settings.rowRule} solid #000!important;padding:8px 0!important;font-weight:${settings.weight}!important;font-size:${tableSize}!important}
    .summary-line{color:#000!important;font-weight:${settings.weight}!important}
    .total{color:#000!important;border-top:${settings.totalRule} solid #000!important;padding-top:8px!important;font-weight:900!important}
    .tag{color:#000!important;background:transparent!important;border:1px solid #000!important;border-radius:0!important;font-weight:${settings.weight}!important}
    .receipt-qr{margin:10px auto 0!important;text-align:center!important}
    .receipt-qr img{display:block!important;width:28mm!important;height:28mm!important;margin:0 auto!important;image-rendering:pixelated!important;shape-rendering:crispEdges!important}
    .receipt-qr small{color:#000!important;font-weight:${settings.weight}!important;font-size:.82em!important}
  </style>`;
};
