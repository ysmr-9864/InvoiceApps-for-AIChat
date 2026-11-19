import { Client } from "@notionhq/client";
import type { InvoiceData, InvoiceItem } from "@/types/invoice";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATA_SOURCE_ID = "fe65c3d892fc44ba985dabb4a6b6ef6e";

type NotionPage = Awaited<ReturnType<typeof notion.pages.retrieve>> & {
  properties: Record<string, any>;
};

function getPropertyValue(prop: any): any {
  if (!prop) return "";
  switch (prop.type) {
    case "title":
      return prop.title?.map((t: any) => t.plain_text).join("") ?? "";
    case "rich_text":
      return prop.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
    case "number":
      return prop.number ?? 0;
    case "select":
      return prop.select?.name ?? "";
    case "status":
      return prop.status?.name ?? "";
    case "date":
      return prop.date?.start ?? "";
    case "formula":
      if (prop.formula.type === "number") return prop.formula.number ?? 0;
      if (prop.formula.type === "string") return prop.formula.string ?? "";
      return "";
    case "rollup":
      if (prop.rollup.type === "array" && prop.rollup.array.length > 0) {
        const first = prop.rollup.array[0];
        return getPropertyValue(first);
      }
      return "";
    case "phone_number":
      return prop.phone_number ?? "";
    case "unique_id":
      return prop.unique_id?.number ?? 0;
    default:
      return "";
  }
}

async function parseItemsFromBlocks(pageId: string): Promise<InvoiceItem[]> {
  const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
  const items: InvoiceItem[] = [];

  for (const block of blocks.results) {
    if (!("type" in block) || block.type !== "table") continue;

    const tableBlock = block as any;
    const rows = await notion.blocks.children.list({ block_id: tableBlock.id, page_size: 100 });

    let isHeader = true;
    for (const row of rows.results) {
      if (!("type" in row) || row.type !== "table_row") continue;
      if (isHeader) {
        isHeader = false;
        continue;
      }

      const cells = (row as any).table_row.cells as any[][];
      const cellTexts = cells.map((cell) =>
        cell.map((t: any) => t.plain_text).join("")
      );

      const no = parseInt(cellTexts[0], 10);
      const description = cellTexts[1] ?? "";
      if (!description) continue;

      const quantity = parseFloat(cellTexts[2]) || 0;
      const unit = cellTexts[3] ?? "";
      const amount = parseFloat((cellTexts[4] ?? "").replace(/,/g, "")) || 0;

      items.push({ no, description, quantity, unit, amount });
    }
    break;
  }

  return items;
}

function pageToInvoice(page: NotionPage, items: InvoiceItem[]): InvoiceData {
  const props = page.properties;
  const subtotal = getPropertyValue(props["請求金額（税抜）"]) as number;
  const tax = getPropertyValue(props["消費税（10%）"]) as number;
  const total = getPropertyValue(props["振込金額（税込）"]) as number;

  return {
    id: page.id,
    url: (page as any).url ?? "",
    invoiceNumber: getPropertyValue(props["請求書番号"]) as string,
    subject: getPropertyValue(props["件名"]) as string,
    status: getPropertyValue(props["ステータス"]) as InvoiceData["status"],
    invoiceDate: getPropertyValue(props["請求日"]) as string,
    dueDate: getPropertyValue(props["振込期限"]) as string,
    subtotal,
    tax,
    total,
    clientName: getPropertyValue(props["請求先会社名"]) as string,
    clientContact: getPropertyValue(props["請求先担当者"]) as string,
    sender: {
      tradeName: getPropertyValue(props["屋号"]) as string,
      name: getPropertyValue(props["氏名"]) as string,
      address: getPropertyValue(props["住所"]) as string,
      phone: getPropertyValue(props["電話番号"]) as string,
      registrationNumber: getPropertyValue(props["登録番号"]) as string,
    },
    bank: {
      bankName: getPropertyValue(props["金融機関名"]) as string,
      branchName: getPropertyValue(props["支店名"]) as string,
      accountType: getPropertyValue(props["口座種別"]) as string,
      accountNumber: getPropertyValue(props["口座番号"]) as string,
      accountHolder: getPropertyValue(props["口座名義"]) as string,
    },
    items,
  };
}

export async function fetchInvoices(): Promise<InvoiceData[]> {
  const response = await notion.databases.query({
    database_id: DATA_SOURCE_ID,
    sorts: [{ property: "請求日", direction: "descending" }],
  });

  const invoices: InvoiceData[] = [];
  for (const page of response.results) {
    if (!("properties" in page)) continue;
    const items = await parseItemsFromBlocks(page.id);
    invoices.push(pageToInvoice(page as NotionPage, items));
  }
  return invoices;
}

export async function fetchInvoice(pageId: string): Promise<InvoiceData> {
  const page = (await notion.pages.retrieve({ page_id: pageId })) as NotionPage;
  const items = await parseItemsFromBlocks(pageId);
  return pageToInvoice(page, items);
}
