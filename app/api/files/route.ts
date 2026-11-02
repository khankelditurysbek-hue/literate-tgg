import { utilization } from "@/lib/utilization";
import { NextRequest, NextResponse } from "next/server";
import { load } from "@/lib/db";
import {
  csv,
  importRows,
  readFile,
  requestColumns,
  requestRows,
  trialColumns,
  xlsx,
} from "@/lib/files";
import { analyze } from "@/lib/calculations";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
      throw new Error("Сыртқы сұрауға рұқсат жоқ");
    if (Number(req.headers.get("content-length")) > 5e6)
      throw new Error("Ең көбі 5 МБ");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 5e6)
      throw new Error("Ең көбі 5 МБ CSV/XLSX файлы");
    const mode = req.nextUrl.searchParams.get("mode");
    if (mode !== "real" && mode !== "demo") throw new Error("Режим жарамсыз");
    const kind =
      req.nextUrl.searchParams.get("kind") === "trials" ? "trials" : "requests";
    const rows = await readFile(
      Buffer.from(await file.arrayBuffer()),
      file.name,
    );
    return NextResponse.json({ rows: importRows(rows, kind, mode) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Импорт қатесі" },
      { status: 400 },
    );
  }
}
export async function GET(req: NextRequest) {
  try {
    const m = req.nextUrl.searchParams.get("mode");
    if (m !== "real" && m !== "demo") throw new Error("Режим жарамсыз");
    const data = load(m).data;
    const kind = req.nextUrl.searchParams.get("kind") || "requests";
    const template = req.nextUrl.searchParams.get("template") === "true";
    const format =
      req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    let rows: Record<string, unknown>[], columns: string[];
    if (kind === "trials") {
      rows = template
        ? []
        : data.trials.map((t) => ({
            ...t,
            calculation: t.requestId
              ? analyze(data.requests.find((r) => r.id === t.requestId)!).status
              : "Бұл лот бойынша негізгі тәуекелді тексеруге қажетті ішкі деректер жоқ",
          }));
      columns = template ? trialColumns : [...trialColumns, "calculation"];
    } else if (kind === "results") {
      rows = data.requests.map((r) => {
        const a = analyze(r);
        return {
          id: r.id,
          title: r.title,
          status: a.status,
          plannedCost: a.plannedCost,
          available: a.available,
          justified: a.justified,
          excess: a.excess,
          potentialDifference: a.potentialDifference,
          confirmedSaving: a.confirmedSaving,
          warning: a.warning,
        };
      });
      columns = [
        "id",
        "title",
        "status",
        "plannedCost",
        "available",
        "justified",
        "excess",
        "potentialDifference",
        "confirmedSaving",
        "warning",
      ];
    } else if (kind === "workloads") {
      rows = data.workloads.map((w) => {
        const a = utilization(w);
        return {
          ...w,
          evidence: JSON.stringify(w.evidence),
          reasons: JSON.stringify(w.reasons),
          utilizationPercent: a.percentage,
          status: a.status,
          limitations: a.conclusion,
        };
      });
      columns = [
        "id",
        "organization",
        "asset",
        "unit",
        "periodStart",
        "periodEnd",
        "capacity",
        "actual",
        "plannedAmount",
        "threshold",
        "comparable",
        "basis",
        "sourcePages",
        "evidence",
        "reasons",
        "expertConclusion",
        "utilizationPercent",
        "status",
        "limitations",
        "createdAt",
        "updatedAt",
      ];
    } else if (kind === "iterations") {
      rows = data.iterations;
      columns = ["id", "createdAt", "prompt", "decision", "checks", "changes"];
    } else {
      rows = template ? [] : requestRows(data);
      columns = requestColumns;
    }
    const content =
      format === "xlsx" ? await xlsx(rows, columns) : csv(rows, columns);
    return new Response(content, {
      headers: {
        "Content-Type":
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="qarjy-${m}-${kind}${template ? "-template" : ""}.${format}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Экспорт қатесі" },
      { status: 400 },
    );
  }
}
