export const getThermalReceiptStyleOverrides = (isA4: boolean) => isA4 ? "" : `<style>
  body{color:#000!important;font-family:Arial,sans-serif!important;font-size:13px!important;font-weight:600!important;line-height:1.5!important}
  .receipt-brand img,.receipt-qr{display:none!important}
  .receipt-brand{margin-bottom:7px!important}
  h1{color:#000!important;font-size:21px!important;font-weight:900!important;letter-spacing:0!important}
  p,.foot,th{color:#000!important;font-weight:700!important}
  p{margin:5px 0 10px!important}
  th{border-bottom:2px solid #000!important;padding:6px 0!important}
  td{color:#000!important;border-bottom:1px solid #000!important;padding:7px 0!important;font-weight:700!important}
  .summary-line{color:#000!important;font-weight:700!important}
  .total{color:#000!important;border-top:3px solid #000!important;padding-top:8px!important;font-weight:900!important}
  .tag{color:#000!important;background:transparent!important;border:1px solid #000!important;border-radius:0!important;font-weight:800!important}
</style>`;
