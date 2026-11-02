import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConflictError, history, load, save } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function mode(req: NextRequest) {
  const m = req.nextUrl.searchParams.get("mode") || "real";
  if (m !== "real" && m !== "demo") throw new Error("Режим жарамсыз");
  return m;
}
export async function GET(req: NextRequest) {
  try {
    const m = mode(req);
    return NextResponse.json(
      { ...load(m), history: history(m) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Деректерді оқу қатесі" },
      { status: 500 },
    );
  }
}
export async function PUT(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
      return NextResponse.json(
        { error: "Сыртқы сұрауға рұқсат жоқ" },
        { status: 403 },
      );
    const body = await req.text();
    if (Buffer.byteLength(body) > 8e6)
      return NextResponse.json(
        { error: "Файл көлемі 8 МБ-тан аспауы тиіс" },
        { status: 413 },
      );
    const { data, version } = JSON.parse(body);
    if (!Number.isInteger(version) || version < 0)
      throw new Error("Нұсқа жарамсыз");
    return NextResponse.json(save(mode(req), data, version));
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof ZodError
            ? e.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ")
            : e instanceof Error
              ? e.message
              : "Сақтау қатесі",
      },
      { status: e instanceof ConflictError ? 409 : 400 },
    );
  }
}
