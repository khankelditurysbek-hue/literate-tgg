import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { demoDataset } from "../lib/demo";
import { emptyDataset } from "../lib/model";
test("SQLite: persistence, mode separation, transaction conflict and immutable history", async () => {
  const folder = mkdtempSync(join(tmpdir(), "qarjy-test-"));
  process.env.QARJY_DB_PATH = join(folder, "test.sqlite");
  const { load, save, history, ConflictError } = await import("../lib/db");
  try {
    assert.equal(load("real").version, 0);
    const demo = demoDataset();
    save("demo", demo, 0);
    assert.deepEqual(load("demo").data, demo);
    assert.deepEqual(load("real").data, emptyDataset());
    assert.throws(() => save("real", demo, 0));
    assert.equal(load("real").version, 0);
    assert.throws(() => save("demo", demo, 0), ConflictError);
    assert.equal(history("demo").length, 1);
    const changed = structuredClone(demo);
    changed.requests[0].title = "Өзгертілді";
    save("demo", changed, 1);
    assert.equal(load("demo").data.requests[0].title, "Өзгертілді");
    assert.equal(history("demo").length, 2);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
