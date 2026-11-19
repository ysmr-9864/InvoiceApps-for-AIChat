import type { InvoiceData } from "@/types/invoice";

function formatDateJP(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function fmt(n: number): string {
  return `¥${n.toLocaleString()}`;
}

const MAX_ROWS = 10;

export function generatePdfHtml(inv: InvoiceData): string {
  const paddedItems = [...inv.items];
  while (paddedItems.length < MAX_ROWS) {
    paddedItems.push({ no: paddedItems.length + 1, description: "", quantity: 0, unit: "", amount: 0 });
  }

  const itemRows = paddedItems
    .map(
      (item, i) => `
    <tr style="background:${i % 2 === 1 ? "#f9f9f9" : "#fff"}">
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;color:#444">${item.no}</td>
      <td style="border:1px solid #ccc;padding:4px 8px">${item.description}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center">${item.description ? item.quantity : ""}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center">${item.unit}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:right;font-family:monospace">${item.description ? fmt(item.amount) : ""}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Noto Sans JP',sans-serif; font-size:12px; color:#1a1a1a; }
  .page { width:210mm; min-height:297mm; padding:15mm 18mm; }
  h1 { text-align:center; font-size:22px; letter-spacing:0.3em; margin-bottom:4px; }
  .title-line { border-bottom:2px solid #1a1a1a; width:180px; margin:0 auto 24px; }
  .header { display:flex; justify-content:space-between; margin-bottom:24px; }
  .client-name { font-size:14px; font-weight:bold; }
  .client-contact { font-size:11px; color:#444; margin-top:2px; }
  .meta { text-align:right; font-size:11px; color:#444; }
  .subject { font-size:12px; margin-bottom:12px; }
  .total-box { border:1px solid #6b9ff5; background:#f0f5ff; padding:8px 16px; margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; width:300px; }
  .total-label { font-size:12px; font-weight:bold; }
  .total-value { font-size:16px; font-weight:bold; }
  .note { font-size:10px; color:#555; margin-bottom:8px; }
  table.items { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:16px; }
  table.items th { background:#f0f0f0; border:1px solid #ccc; padding:4px 8px; font-weight:600; }
  .summary { display:flex; justify-content:flex-end; margin-bottom:32px; }
  .summary-table { width:240px; }
  .summary-row { display:flex; justify-content:space-between; padding:3px 0; font-size:11px; }
  .summary-row.total { border-top:1px solid #888; margin-top:4px; padding-top:6px; font-weight:bold; }
  .footer { display:flex; justify-content:space-between; font-size:10px; color:#444; }
  .footer .section-title { font-weight:bold; color:#1a1a1a; font-size:12px; margin-bottom:4px; }
  .footer-right { text-align:right; }
  .small-note { font-size:9px; color:#666; margin-top:4px; }
</style>
</head>
<body>
<div class="page">
  <h1>請 求 書</h1>
  <div class="title-line"></div>

  <div class="header">
    <div>
      <div class="client-name">${inv.clientName} 御中</div>
      ${inv.clientContact ? `<div class="client-contact">ご担当：${inv.clientContact} 様</div>` : ""}
    </div>
    <div class="meta">
      <div>請求書番号：${inv.invoiceNumber}</div>
      <div>請求日：${formatDateJP(inv.invoiceDate)}</div>
    </div>
  </div>

  <div class="subject">件名：${inv.subject}</div>

  <div class="total-box">
    <span class="total-label">ご請求金額（税込）</span>
    <span class="total-value">${fmt(inv.total)}</span>
  </div>

  <div class="note">下記の通りご請求申し上げます。</div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:36px;text-align:center">No</th>
        <th style="text-align:left">項目</th>
        <th style="width:56px;text-align:center">数量</th>
        <th style="width:48px;text-align:center">単位</th>
        <th style="width:100px;text-align:right">税抜金額</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="summary">
    <div class="summary-table">
      <div class="summary-row"><span style="color:#444">小計（税抜）</span><span style="font-family:monospace">${fmt(inv.subtotal)}</span></div>
      <div class="summary-row"><span style="color:#444">消費税（10%）</span><span style="font-family:monospace">${fmt(inv.tax)}</span></div>
      <div class="summary-row total"><span>合計（税込）</span><span style="font-family:monospace">${fmt(inv.total)}</span></div>
    </div>
  </div>

  <div class="footer">
    <div>
      <div class="section-title">お振込先</div>
      <div>${inv.bank.bankName} ${inv.bank.branchName} ${inv.bank.accountType} ${inv.bank.accountNumber}</div>
      <div>口座名義：${inv.bank.accountHolder}</div>
      <div style="margin-top:8px">振込期限：${formatDateJP(inv.dueDate)}</div>
      <div class="small-note">※ 振込手数料はご負担いただきますようお願いいたします。</div>
    </div>
    <div class="footer-right">
      <div class="section-title">${inv.sender.tradeName}</div>
      <div>${inv.sender.name}</div>
      <div>${inv.sender.address}</div>
      <div>TEL: ${inv.sender.phone}</div>
      <div>登録番号: ${inv.sender.registrationNumber}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}
