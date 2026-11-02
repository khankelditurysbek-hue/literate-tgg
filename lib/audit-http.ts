import { NextRequest, NextResponse } from "next/server";
export function getAuditMode(req: NextRequest) {
  const m = req.nextUrl.searchParams.get("mode") || "real";
  if (m !== "real" && m !== "demo") throw new Error("Режим жарамсыз");
  return m;
}
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host"))
    throw new Error("Сыртқы сұрауға рұқсат жоқ");
}
export function auditError(e: unknown) {
  const message = e instanceof Error ? e.message : "Қате";
  return NextResponse.json(
    { error: message },
    { status: message.startsWith("CONFLICT:") ? 409 : 400 },
  );
}
