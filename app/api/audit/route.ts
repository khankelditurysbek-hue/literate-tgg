import { NextRequest, NextResponse } from "next/server";
import {
  auditHistory,
  listDocuments,
  loadAudit,
  saveAudit,
} from "@/lib/audit-storage";
import { auditError, getAuditMode, sameOrigin } from "@/lib/audit-http";
import { seedAuditDemo } from "@/lib/audit-demo";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const m = getAuditMode(req);
    return NextResponse.json(
      {
        ...loadAudit(m),
        documents: listDocuments(m),
        history: auditHistory(m),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return auditError(e);
  }
}
export async function PUT(req: NextRequest) {
  try {
    sameOrigin(req);
    const body = await req.text();
    if (Buffer.byteLength(body) > 6e6)
      throw new Error("Дерек 6 МБ-тан аспауы тиіс");
    const value = JSON.parse(body);
    if (!Number.isInteger(value.version) || value.version < 0)
      throw new Error("Нұсқа жарамсыз");
    return NextResponse.json(
      saveAudit(getAuditMode(req), value.data, value.version),
    );
  } catch (e) {
    return auditError(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    if (getAuditMode(req) !== "demo")
      throw new Error("Үлгі тек DEMO режимінде қосылады");
    seedAuditDemo();
    return NextResponse.json({
      ...loadAudit("demo"),
      documents: listDocuments("demo"),
    });
  } catch (e) {
    return auditError(e);
  }
}
