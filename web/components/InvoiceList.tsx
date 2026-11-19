"use client";

import { useState, useRef, useEffect } from "react";
import type { InvoiceData } from "@/types/invoice";

type Filter = "all" | "incomplete" | "未送信" | "送信済み" | "振込完了";
type Status = InvoiceData["status"];

const STATUSES: Status[] = ["未送信", "送信済み", "振込完了"];

const STATUS_STYLE: Record<string, string> = {
  未送信: "bg-red-100 text-red-700 hover:bg-red-200",
  送信済み: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  振込完了: "bg-green-100 text-green-700 hover:bg-green-200",
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "incomplete", label: "未完了" },
  { value: "未送信", label: "未送信" },
  { value: "送信済み", label: "送信済み" },
  { value: "振込完了", label: "振込完了" },
];

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function formatCurrency(n: number): string {
  return `¥${n.toLocaleString()}`;
}

function StatusDropdown({
  invoiceId,
  currentStatus,
  onChanged,
}: {
  invoiceId: string;
  currentStatus: Status;
  onChanged: (id: string, newStatus: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function changeStatus(newStatus: Status) {
    if (newStatus === currentStatus) {
      setOpen(false);
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch("/api/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: invoiceId, status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        onChanged(invoiceId, newStatus);
      }
    } finally {
      setUpdating(false);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={updating}
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
          updating ? "opacity-50" : ""
        } ${STATUS_STYLE[currentStatus] ?? "bg-gray-100 text-gray-600"}`}
      >
        {updating ? "..." : currentStatus}
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-28">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                changeStatus(s);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-50 transition-colors ${
                s === currentStatus ? "font-bold" : ""
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  s === "未送信" ? "bg-red-500" : s === "送信済み" ? "bg-yellow-500" : "bg-green-500"
                }`}
              />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvoiceList({ invoices: initialInvoices }: { invoices: InvoiceData[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function handleStatusChanged(id: string, newStatus: Status) {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: newStatus } : inv))
    );
    setToast({ message: `✅ ステータスを「${newStatus}」に変更しました`, type: "success" });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = invoices.filter((inv) => {
    if (filter === "all") return true;
    if (filter === "incomplete") return inv.status !== "振込完了";
    return inv.status === filter;
  });

  const allSelected = filtered.length > 0 && filtered.every((inv) => selected.has(inv.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((inv) => inv.id)));
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function bulkPdf() {
    if (selected.size === 0) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.ok) {
        setToast({ message: `✅ ${data.count}件のPDFを生成しました → Downloads`, type: "success" });
      } else {
        setToast({ message: `❌ エラー: ${data.error}`, type: "error" });
      }
    } catch (e) {
      setToast({ message: `❌ エラー: ${e}`, type: "error" });
    } finally {
      setGenerating(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
        <h1 className="text-lg font-bold">🧾 請求書一覧</h1>
        <span className="text-sm text-gray-400">{invoices.length}件</span>
      </div>

      {/* Filter + Bulk action */}
      <div className="bg-white border-x border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={bulkPdf}
          disabled={selected.size === 0 || generating}
          className="px-4 py-1.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? "生成中..." : `📥 選択した請求書をPDF出力 (${selected.size})`}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">請求書番号</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">件名</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">請求先</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">請求日</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">振込期限</th>
              <th className="text-right px-3 py-2 font-medium text-gray-500">税込金額</th>
              <th className="text-center px-3 py-2 font-medium text-gray-500">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => {
                  window.location.href = `/invoice/${inv.id}`;
                }}
              >
                <td
                  className="px-3 py-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(inv.id);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(inv.id)}
                    onChange={() => toggle(inv.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-3 py-3 font-mono text-blue-600 font-medium">
                  {inv.invoiceNumber || "—"}
                </td>
                <td className="px-3 py-3 text-gray-900 max-w-xs truncate">{inv.subject}</td>
                <td className="px-3 py-3 text-gray-600">{inv.clientName || "—"}</td>
                <td className="px-3 py-3 text-gray-600">{formatDate(inv.invoiceDate)}</td>
                <td className="px-3 py-3 text-gray-600">{formatDate(inv.dueDate)}</td>
                <td className="px-3 py-3 text-right font-mono text-gray-900">
                  {inv.total ? formatCurrency(inv.total) : "—"}
                </td>
                <td className="px-3 py-3 text-center">
                  <StatusDropdown
                    invoiceId={inv.id}
                    currentStatus={inv.status}
                    onChanged={handleStatusChanged}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                  該当する請求書がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
