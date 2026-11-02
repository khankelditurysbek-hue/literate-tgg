import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  checkMode,
  datasetSchema,
  emptyDataset,
  type Dataset,
  type Mode,
} from "./model";
const filename = process.env.QARJY_DB_PATH || resolve("data/qarjy.sqlite");
let connection: DatabaseSync | undefined;
function db() {
  if (!connection) {
    mkdirSync(dirname(filename), { recursive: true });
    connection = new DatabaseSync(filename);
    connection.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS datasets(mode TEXT PRIMARY KEY CHECK(mode IN ('real','demo')),version INTEGER NOT NULL,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY AUTOINCREMENT,mode TEXT NOT NULL,version INTEGER NOT NULL,changed_at TEXT NOT NULL,payload TEXT NOT NULL);`);
  }
  return connection;
}
export function load(mode: Mode): { data: Dataset; version: number } {
  const row = db()
    .prepare("SELECT version,payload FROM datasets WHERE mode=?")
    .get(mode) as { version: number; payload: string } | undefined;
  return row
    ? {
        data: datasetSchema.parse(JSON.parse(row.payload)),
        version: row.version,
      }
    : { data: emptyDataset(), version: 0 };
}
export class ConflictError extends Error {}
export function save(mode: Mode, input: unknown, version: number) {
  const data = datasetSchema.parse(input);
  checkMode(data, mode);
  const sql = db();
  sql.exec("BEGIN IMMEDIATE");
  try {
    const current = load(mode);
    if (current.version !== version)
      throw new ConflictError(
        "Деректер басқа терезеде өзгерді. Қайта жүктеңіз.",
      );
    const payload = JSON.stringify(data);
    const next = version + 1;
    sql
      .prepare(
        "INSERT INTO datasets(mode,version,payload) VALUES(?,?,?) ON CONFLICT(mode) DO UPDATE SET version=excluded.version,payload=excluded.payload",
      )
      .run(mode, next, payload);
    sql
      .prepare(
        "INSERT INTO history(mode,version,changed_at,payload) VALUES(?,?,?,?)",
      )
      .run(mode, next, new Date().toISOString(), payload);
    sql.exec("COMMIT");
    return { data, version: next };
  } catch (e) {
    sql.exec("ROLLBACK");
    throw e;
  }
}
export function history(mode: Mode) {
  return db()
    .prepare(
      "SELECT id,version,changed_at FROM history WHERE mode=? ORDER BY id DESC LIMIT 100",
    )
    .all(mode);
}
