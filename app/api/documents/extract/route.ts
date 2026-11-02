import { NextRequest, NextResponse } from "next/server";
import { getDocument, savePage } from "@/lib/audit-storage";
import { extractDocument } from "@/lib/document-extraction";
import { auditError, getAuditMode, sameOrigin } from "@/lib/audit-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const body = await req.text();
    if (body.length > 2000) throw new Error("Сұрау тым үлкен");
    const { id, page, ocr } = JSON.parse(body);
    if (
      typeof id !== "string" ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 500
    )
      throw new Error("Файл және бет қажет");
    const mode = getAuditMode(req),
      doc = getDocument(id, mode);
    if (!doc) throw new Error("Файл табылмады");
    const cached = doc.meta.pages.find((p) => p.page === page);
    if (cached && ocr !== true) return NextResponse.json(doc.meta);
    const result = await extractDocument(
      doc.bytes,
      doc.meta.mime,
      page,
      ocr === true,
    );
    return NextResponse.json(savePage(id, mode, result.page, result.total));
  } catch (e) {
    return auditError(e);
  }
}
