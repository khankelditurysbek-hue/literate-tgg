import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import {
  auditSetSchema,
  type AuditSet,
  type SourceDocument,
  type SourcePage,
} from "./audit-model";
let connection: DatabaseSync | undefined;
function db() {
  if (!connection) {
    const filename = process.env.QARJY_DB_PATH || resolve("data/qarjy.sqlite");
    mkdirSync(dirname(filename), { recursive: true });
    connection = new DatabaseSync(filename);
    connection.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS audit_sets(mode TEXT PRIMARY KEY,version INTEGER NOT NULL,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_history(id INTEGER PRIMARY KEY AUTOINCREMENT,mode TEXT NOT NULL,version INTEGER NOT NULL,at TEXT NOT NULL,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS source_documents(id TEXT PRIMARY KEY,mode TEXT NOT NULL,meta TEXT NOT NULL,bytes BLOB NOT NULL);`);
  }
  return connection;
}
export function loadAudit(mode: "real" | "demo"): {
  data: AuditSet;
  version: number;
} {
  const row = db()
    .prepare("SELECT payload,version FROM audit_sets WHERE mode=?")
    .get(mode) as { payload: string; version: number } | undefined;
  return row
    ? {
        data: auditSetSchema.parse(JSON.parse(row.payload)),
        version: row.version,
      }
    : { data: { cases: [] }, version: 0 };
}
export function saveAudit(
  mode: "real" | "demo",
  input: unknown,
  version: number,
) {
  const data = auditSetSchema.parse(input);
  if (data.cases.some((c) => c.mode !== mode))
    throw new Error("Нақты және DEMO деректерін араластыруға болмайды");
  const sql = db();
  sql.exec("BEGIN IMMEDIATE");
  try {
    const old = loadAudit(mode);
    if (old.version !== version)
      throw new Error("CONFLICT: Басқа терезеде өзгерді. Қайта жүктеңіз.");
    const payload = JSON.stringify(data);
    sql
      .prepare(
        "INSERT INTO audit_sets VALUES(?,?,?) ON CONFLICT(mode) DO UPDATE SET version=excluded.version,payload=excluded.payload",
      )
      .run(mode, version + 1, payload);
    sql
      .prepare(
        "INSERT INTO audit_history(mode,version,at,payload) VALUES(?,?,?,?)",
      )
      .run(mode, version + 1, new Date().toISOString(), payload);
    sql.exec("COMMIT");
    return { data, version: version + 1 };
  } catch (e) {
    sql.exec("ROLLBACK");
    throw e;
  }
}
export function listDocuments(mode: "real" | "demo"): SourceDocument[] {
  return (
    db()
      .prepare("SELECT meta FROM source_documents WHERE mode=? ORDER BY rowid")
      .all(mode) as { meta: string }[]
  ).map((r) => JSON.parse(r.meta));
}
export function getDocument(id: string, mode: "real" | "demo") {
  const row = db()
    .prepare("SELECT meta,bytes FROM source_documents WHERE id=? AND mode=?")
    .get(id, mode) as { meta: string; bytes: Uint8Array } | undefined;
  return row
    ? {
        meta: JSON.parse(row.meta) as SourceDocument,
        bytes: Buffer.from(row.bytes),
      }
    : null;
}
export function addDocument(
  input: Omit<SourceDocument, "id" | "size" | "sha256" | "uploadedAt">,
  bytes: Buffer,
  fixedId?: string,
) {
  const meta: SourceDocument = {
    ...input,
    id: fixedId || randomUUID(),
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    uploadedAt: new Date().toISOString(),
  };
  if (
    (input.mode === "real" && input.origin === "demo") ||
    (input.mode === "demo" && input.origin !== "demo")
  )
    throw new Error("Дерек режимі сәйкес емес");
  db()
    .prepare("INSERT INTO source_documents(id,mode,meta,bytes) VALUES(?,?,?,?)")
    .run(meta.id, meta.mode, JSON.stringify(meta), bytes);
  return meta;
}
export function savePage(
  id: string,
  mode: "real" | "demo",
  page: SourcePage,
  totalPages: number,
) {
  const document = getDocument(id, mode);
  if (!document) throw new Error("Файл табылмады");
  const meta = {
    ...document.meta,
    totalPages,
    pages: [
      ...document.meta.pages.filter((p) => p.page !== page.page),
      page,
    ].sort((a, b) => a.page - b.page),
  };
  db()
    .prepare("UPDATE source_documents SET meta=? WHERE id=? AND mode=?")
    .run(JSON.stringify(meta), id, mode);
  return meta;
}
export function auditHistory(mode: "real" | "demo") {
  return db()
    .prepare(
      "SELECT version,at FROM audit_history WHERE mode=? ORDER BY id DESC LIMIT 100",
    )
    .all(mode);
}
