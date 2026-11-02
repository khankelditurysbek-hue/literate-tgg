import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import {
  requestSchema,
  trialSchema,
  checkMode,
  emptyDataset,
  emptyEvidence,
  emptyFinance,
  type Request,
  type Mode,
  type Dataset,
} from "./model";
export const requestColumns = [
  "id",
  "organization",
  "title",
  "category",
  "plannedQuantity",
  "unit",
  "unitPrice",
  "requiredOutcome",
  "requiredQuantity",
  "horizon",
  "source",
  "document",
  "url",
  "date",
  "reliability",
  "verified",
  "justification",
  "inventoryConfirmed",
  "assets",
  "alternatives",
  "finance",
  "createdAt",
  "updatedAt",
];
export const trialColumns = [
  "id",
  "type",
  "officialId",
  "title",
  "url",
  "date",
  "plannedQuantity",
  "unitPrice",
  "requestId",
  "notes",
];
export function csv(rows: Record<string, unknown>[], columns?: string[]) {
  return (
    "\uFEFF" +
    stringify(rows, {
      header: true,
      columns,
      cast: { boolean: (v) => String(v) },
      escape_formulas: true,
    })
  );
}
export function requestRows(data: Dataset) {
  return data.requests.map((r) => {
    const { evidence, assets, alternatives, finance, ...rest } = r;
    return {
      ...rest,
      ...evidence,
      assets: JSON.stringify(assets),
      alternatives: JSON.stringify(alternatives),
      finance: JSON.stringify(finance),
    };
  });
}
const number = (v: unknown) =>
  v === "" || v === undefined || v === null ? null : Number(v);
function bool(v: unknown) {
  if (v === true || v === "true") return true;
  if (v === false || v === "false" || v === "" || v === undefined) return false;
  throw new Error("Boolean мәні true немесе false болуы тиіс");
}
const json = (v: unknown, fallback: unknown) =>
  v === "" || v === undefined
    ? fallback
    : typeof v === "string"
      ? JSON.parse(v)
      : v;
export function importRows(
  rows: Record<string, unknown>[],
  kind: "requests" | "trials",
  mode: Mode,
) {
  if (!rows.length) throw new Error("Файл бос");
  if (rows.length > 10000) throw new Error("Ең көбі 10 000 жол");
  const now = new Date().toISOString();
  const parsed = rows.map((r, i) => {
    try {
      if (kind === "trials")
        return trialSchema.parse({
          ...r,
          plannedQuantity: number(r.plannedQuantity),
          unitPrice: number(r.unitPrice),
          requestId: r.requestId || "",
          notes: r.notes || "",
        });
      const e = emptyEvidence(mode === "demo");
      return requestSchema.parse({
        id: r.id,
        organization: r.organization,
        title: r.title,
        category: r.category,
        plannedQuantity: number(r.plannedQuantity),
        unit: r.unit,
        unitPrice: number(r.unitPrice),
        requiredOutcome: r.requiredOutcome,
        requiredQuantity: number(r.requiredQuantity),
        horizon: number(r.horizon),
        evidence: {
          source: r.source || e.source,
          document: r.document || "",
          url: r.url || "",
          date: r.date || "",
          reliability: r.reliability || e.reliability,
          verified: bool(r.verified),
        },
        justification: r.justification || "",
        inventoryConfirmed: bool(r.inventoryConfirmed),
        assets: json(r.assets, []),
        alternatives: json(r.alternatives, []),
        finance: json(r.finance, {
          ...emptyFinance(),
          evidence: emptyEvidence(mode === "demo"),
        }),
        createdAt: r.createdAt || now,
        updatedAt: r.updatedAt || now,
      });
    } catch (e) {
      throw new Error(
        `${i + 2}-жол: ${e instanceof Error ? e.message : "Дерек жарамсыз"}`,
      );
    }
  });
  if (new Set(parsed.map((r) => r.id)).size !== parsed.length)
    throw new Error("Файлдағы идентификаторлар қайталанады");
  if (kind === "requests")
    checkMode({ ...emptyDataset(), requests: parsed as Request[] }, mode);
  return parsed;
}
export async function readFile(buffer: Buffer, name: string) {
  if (name.toLowerCase().endsWith(".csv"))
    return parse(buffer.toString("utf8"), {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      max_record_size: 1000000,
    }) as Record<string, unknown>[];
  if (!name.toLowerCase().endsWith(".xlsx"))
    throw new Error("CSV немесе XLSX файлын таңдаңыз");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Кесте жоқ");
  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map(String);
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const record: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const v = row.getCell(i + 1).value;
      if (v && typeof v === "object")
        throw new Error("Формулалар мен күрделі ұяшықтар қабылданбайды");
      record[h] = v ?? "";
    });
    rows.push(record);
  });
  return rows;
}
export async function xlsx(rows: Record<string, unknown>[], columns: string[]) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("QARJY CONTROL");
  sheet.columns = columns.map((key) => ({ header: key, key, width: 24 }));
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}
export function mergeRequests(data: Dataset, requests: Request[]) {
  const ids = new Set(data.requests.map((r) => r.id));
  if (requests.some((r) => ids.has(r.id)))
    throw new Error(
      "Бар идентификатор табылды. Өтінімді формада өзгертіңіз немесе импорт идентификаторын түзетіңіз.",
    );
  return { ...data, requests: [...data.requests, ...requests] };
}
