import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/audit-storage";
import { auditError, getAuditMode, sameOrigin } from "@/lib/audit-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const body = await req.text();
    if (body.length > 2000) throw new Error("Сұрау тым үлкен");
    const { id, page } = JSON.parse(body);
    if (
      typeof id !== "string" ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 500
    )
      throw new Error("Файл және бет қажет");
    const d = getDocument(id, getAuditMode(req));
    if (!d) throw new Error("Файл табылмады");
    let bytes: Uint8Array = d.bytes,
      mime = d.meta.mime;
    if (mime === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const p = new PDFParse({ data: d.bytes });
      try {
        const screenshot = await p.getScreenshot({
          partial: [page],
          desiredWidth: 1500,
          imageBuffer: true,
          imageDataUrl: false,
        });
        if (!screenshot.pages.length) throw new Error("PDF беті жоқ");
        bytes = screenshot.pages[0].data;
        mime = "image/png";
      } finally {
        await p.destroy();
      }
    } else if (!mime.startsWith("image/"))
      throw new Error("TXT және XLSX үшін мәтін көрінісін пайдаланыңыз");
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return auditError(e);
  }
}
