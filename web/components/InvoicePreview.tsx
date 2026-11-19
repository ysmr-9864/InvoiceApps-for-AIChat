"use client";

import { useState } from "react";
import type { InvoiceData } from "@/types/invoice";

function formatDateJP(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatCurrency(n: number): string {
  return `¥${n.toLocaleString()}`;
}

const MAX_ROWS = 10;

export default function InvoicePreview({ invoice }: { invoice: InvoiceData }) {
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const inv = invoice;

  const paddedItems = [...inv.items];
  while (paddedItems.length < MAX_ROWS) {
    paddedItems.push({ no: paddedItems.length + 1, description: "", quantity: 0, unit: "", amount: 0 });
  }

  async function downloadPdf() {
    setGenerating(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [inv.id] }),
      });
      const data = await res.json();
      if (data.ok) {
        setToast({ message: "✅ PDFを生成しました → Downloads", type: "success" });
      } else {
        setToast({ message: `❌ エラー: ${data.error}`, type: "error" });
      }
    } catch (e) {
      setToast({ message: `❌ エラー: ${e}`, type: "error" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium print:hidden ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Action bar */}
      <div className="print:hidden max-w-4xl mx-auto mb-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2">
        <a
          href="/"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← 一覧に戻る
        </a>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            🖨 印刷
          </button>
          <button
            onClick={downloadPdf}
            disabled={generating}
            className="px-4 py-1.5 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            {generating ? "生成中..." : "📥 PDF"}
          </button>
        </div>
      </div>

      {/* A4 Invoice */}
      <div
        id="invoice-print"
        className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none"
        style={{ padding: "48px 56px", fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif", color: "#1a1a1a" }}
      >
        {/* Title */}
        <h1 className="text-center text-2xl font-bold tracking-[0.3em] mb-1">
          請 求 書
        </h1>
        <div className="border-b-2 border-gray-900 w-48 mx-auto mb-6" />

        {/* Header row */}
        <div className="flex justify-between mb-6">
          <div>
            <p className="text-base font-semibold">
              {inv.clientName}{" "}
              <span className="font-normal">御中</span>
            </p>
            {inv.clientContact && (
              <p className="text-sm text-gray-700 mt-0.5">
                ご担当：{inv.clientContact} 様
              </p>
            )}
          </div>
          <div className="text-right text-sm text-gray-800">
            <p>請求書番号：{inv.invoiceNumber}</p>
            <p>請求日：{formatDateJP(inv.invoiceDate)}</p>
          </div>
        </div>

        {/* 件名 */}
        <p className="text-sm mb-3">件名：{inv.subject}</p>

        {/* 合計金額ボックス */}
        <div className="border border-blue-400 bg-blue-50 px-4 py-2 mb-6 flex items-center justify-between w-80">
          <span className="text-sm font-semibold">ご請求金額（税込）</span>
          <span className="text-lg font-bold">{formatCurrency(inv.total)}</span>
        </div>

        <p className="text-xs text-gray-700 mb-2">下記の通りご請求申し上げます。</p>

        {/* 明細テーブル */}
        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1 w-10 text-center">No</th>
              <th className="border border-gray-300 px-2 py-1 text-left">項目</th>
              <th className="border border-gray-300 px-2 py-1 w-16 text-center">数量</th>
              <th className="border border-gray-300 px-2 py-1 w-14 text-center">単位</th>
              <th className="border border-gray-300 px-2 py-1 w-28 text-right">税抜金額</th>
            </tr>
          </thead>
          <tbody>
            {paddedItems.map((item, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                <td className="border border-gray-300 px-2 py-1 text-center text-gray-700">{item.no}</td>
                <td className="border border-gray-300 px-2 py-1">{item.description}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  {item.description ? item.quantity : ""}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.unit}</td>
                <td className="border border-gray-300 px-2 py-1 text-right font-mono">
                  {item.description ? formatCurrency(item.amount) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 金額サマリー */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-700">小計（税抜）</span>
              <span className="font-mono">{formatCurrency(inv.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-700">消費税（10%）</span>
              <span className="font-mono">{formatCurrency(inv.tax)}</span>
            </div>
            <div className="border-t border-gray-400 mt-1 pt-1 flex justify-between text-sm font-bold py-1">
              <span>合計（税込）</span>
              <span className="font-mono">{formatCurrency(inv.total)}</span>
            </div>
          </div>
        </div>

        {/* 振込先 + 差出人 */}
        <div className="flex justify-between text-xs text-gray-800">
          <div>
            <p className="font-semibold text-gray-900 mb-1 text-sm">お振込先</p>
            <p>{inv.bank.bankName} {inv.bank.branchName} {inv.bank.accountType} {inv.bank.accountNumber}</p>
            <p>口座名義：{inv.bank.accountHolder}</p>
            <p className="mt-2">振込期限：{formatDateJP(inv.dueDate)}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              ※ 振込手数料はご負担いただきますようお願いいたします。
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900 text-sm">{inv.sender.tradeName}</p>
            <p>{inv.sender.name}</p>
            <p>{inv.sender.address}</p>
            <p>TEL: {inv.sender.phone}</p>
            <p>登録番号: {inv.sender.registrationNumber}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
