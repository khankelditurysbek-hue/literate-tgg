import { NextRequest, NextResponse } from "next/server";
import { addDocument, getDocument, listDocuments } from "@/lib/audit-storage";
import { documentMetaSchema } from "@/lib/audit-model";
import { detectMime } from "@/lib/document-extraction";
import { auditError, getAuditMode, sameOrigin } from "@/lib/audit-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const mode = getAuditMode(req),
      id = req.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json(listDocuments(mode), {
        headers: { "Cache-Control": "no-store" },
      });
    const d = getDocument(id, mode);
    if (!d)
      return NextResponse.json({ error: "Файл табылмады" }, { status: 404 });
    return new NextResponse(new Uint8Array(d.bytes), {
      headers: {
        "Content-Type": d.meta.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(d.meta.name)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (e) {
    return auditError(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const size = Number(req.headers.get("content-length") || 0);
    if (size > 9e6) throw new Error("Файл 8 МБ-тан аспауы тиіс");
    const form = await req.formData(),
      file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 8e6)
      throw new Error("1 байт — 8 МБ файл қажет");
    const bytes = Buffer.from(await file.arrayBuffer()),
      mime = detectMime(bytes),
      mode = getAuditMode(req);
    const meta = documentMetaSchema.parse({
      source: form.get("source"),
      url: form.get("url"),
      date: form.get("date"),
      origin: form.get("origin"),
    });
    if (
      mime === "text/plain" &&
      /<\s*(?:script|html|svg|iframe)\b/i.test(bytes.toString())
    )
      throw new Error("Белсенді HTML/SVG орнына TXT жүктеңіз");
    const d = addDocument(
      {
        ...meta,
        mode,
        name: file.name.replace(/[\x00-\x1f/\\]/g, "_").slice(0, 180),
        mime,
        pages: [],
        totalPages: 1,
      },
      bytes,
    );
    return NextResponse.json(d, { status: 201 });
  } catch (e) {
    return auditError(e);
  }
}
