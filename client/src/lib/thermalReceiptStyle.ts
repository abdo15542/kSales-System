export const getThermalReceiptStyleOverrides = (isA4: boolean) => isA4 ? "" : `<style>
  body{color:#000!important;background:#fff!important;font-family:Arial,sans-serif!important;font-size:14px!important;font-weight:700!important;line-height:1.5!important}
  .receipt-brand img{display:none!important}
  .receipt-brand{margin-bottom:7px!important}
  h1{color:#000!important;font-size:21px!important;font-weight:900!important;letter-spacing:0!important}
  p,.foot,th{color:#000!important;font-weight:700!important}
  p{margin:5px 0 10px!important}
  th{border-bottom:3px solid #000!important;padding:7px 0!important;font-size:14px!important}
  td{color:#000!important;border-bottom:2px solid #000!important;padding:8px 0!important;font-weight:800!important;font-size:14px!important}
  .summary-line{color:#000!important;font-weight:700!important}
  .total{color:#000!important;border-top:3px solid #000!important;padding-top:8px!important;font-weight:900!important}
  .tag{color:#000!important;background:transparent!important;border:1px solid #000!important;border-radius:0!important;font-weight:800!important}
  .receipt-qr{margin:10px auto 0!important;text-align:center!important}
  .receipt-qr img{display:block!important;width:28mm!important;height:28mm!important;margin:0 auto!important;image-rendering:pixelated!important;shape-rendering:crispEdges!important}
  .receipt-qr small{color:#000!important;font-weight:800!important;font-size:.82em!important}
</style>`;
