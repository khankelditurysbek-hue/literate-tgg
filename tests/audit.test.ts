import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newAuditCase,
  auditCaseSchema,
  type AuditCase,
  type SourceDocument,
  type Citation,
  type InputKey,
} from "../lib/audit-model";
import {
  assessQuantity,
  assessMarket,
  assessBusinessCase,
  auditKri,
  parseSourceNumber,
  citationIssues,
  median,
} from "../lib/audit-engine";
import { auditReportHtml, auditResultsCsv } from "../lib/audit-report";
function fixture(
  profile: AuditCase["profile"] = "equipment",
  values: Partial<Record<InputKey, number>> = {
    planned: 20,
    demand: 20,
    capacity: 1,
    existing: 12,
    reserve: 0,
  },
) {
  const c = newAuditCase("real", profile);
  c.outcome = "Бір кезеңдегі 20 жұмыс орны";
  c.specification = "Бірдей техникалық сипаттама";
  const docs: SourceDocument[] = [];
  function cite(value: number, id: string, line = `Саны = ${value}`): Citation {
    docs.push({
      id,
      mode: "real",
      name: `${id}.txt`,
      mime: "text/plain",
      size: 100,
      sha256: id.padEnd(64, "0"),
      source: "Тест фикстурасы",
      url: "",
      date: "2026-11-02",
      origin: "internal",
      uploadedAt: "2026-11-02T00:00:00Z",
      pages: [
        {
          page: 1,
          text: line + "\n" + c.specification,
          method: "text",
          confidence: null,
        },
      ],
      totalPages: 1,
    });
    return {
      value,
      documentId: id,
      page: 1,
      quote: line,
      raw: String(value),
      context: "Тест: бірдей өлшем және кезең",
    };
  }
  for (const [key, value] of Object.entries(values))
    c.inputs[key as InputKey] = cite(value, `need-${key}`);
  return { c, docs, cite };
}
test("Equipment: source-linked demand and existing capacity give 8 needed, 12 flagged", () => {
  const { c, docs } = fixture();
  const r = assessQuantity(c, docs);
  assert.equal(r.need, 8);
  assert.equal(r.excess, 12);
  assert.equal(r.status, "flag");
});
test("No file, wrong mode, page, quote, raw number or context fails closed", () => {
  for (const mutation of [
    (v: Citation) => (v.documentId = "missing"),
    (v: Citation) => (v.page = 2),
    (v: Citation) => (v.quote = "20 is invented"),
    (v: Citation) => (v.value = 30),
    (v: Citation) => (v.context = ""),
  ]) {
    const { c, docs } = fixture();
    mutation(c.inputs.planned);
    assert.equal(assessQuantity(c, docs).need, null);
  }
  const { c, docs } = fixture();
  docs[0].mode = "demo";
  assert.equal(assessQuantity(c, docs).need, null);
});
test("Unknown is not zero; documented zero is valid", () => {
  const { c, docs } = fixture();
  assert.equal(assessQuantity(c, docs).need, 8);
  c.inputs.reserve.value = null;
  assert.equal(assessQuantity(c, docs).need, null);
});
test("Source parser handles grouping and comma, refuses ambiguous currency or arithmetic", () => {
  assert.equal(parseSourceNumber("1 200,50"), 1200.5);
  assert.equal(parseSourceNumber("1\u202f200"), 1200);
  assert.equal(parseSourceNumber("1,200.50"), null);
  assert.equal(parseSourceNumber("20*3"), null);
});
test("Evidence rejects infinity, negative values and numbers without the raw token", () => {
  const { c, docs } = fixture();
  for (const value of [-1, Infinity, NaN])
    assert.ok(
      citationIssues({ ...c.inputs.planned, value }, docs, "real").length,
    );
  assert.ok(
    citationIssues({ ...c.inputs.planned, raw: "999" }, docs, "real").length,
  );
});
test("Consumables deduct stock and committed delivery across consumption periods", () => {
  const { c, docs } = fixture("consumables", {
    planned: 1000,
    demand: 100,
    rate: 2,
    periods: 3,
    stock: 100,
    incoming: 100,
    reserve: 0,
  });
  assert.equal(assessQuantity(c, docs).need, 400);
  assert.equal(assessQuantity(c, docs).excess, 600);
});
test("Service converts missing hours to packages, not to equipment units", () => {
  const { c, docs } = fixture("service", {
    planned: 12,
    demand: 1200,
    capacity: 120,
    existing: 480,
    reserve: 1,
  });
  assert.equal(assessQuantity(c, docs).need, 7);
  assert.equal(assessQuantity(c, docs).excess, 5);
});
test("Works compares only a documented measurement line and keeps decimal units", () => {
  const { c, docs } = fixture("works", { planned: 120.5, estimate: 100.2 });
  assert.equal(assessQuantity(c, docs).need, 100.2);
  assert.equal(assessQuantity(c, docs).excess, 20.3);
});
test("Reserve prevents a false flag; low use does not automatically remove reserve", () => {
  const { c, docs } = fixture("equipment", {
    planned: 4,
    demand: 40,
    capacity: 40,
    existing: 0,
    reserve: 3,
  });
  assert.equal(assessQuantity(c, docs).need, 4);
  assert.equal(assessQuantity(c, docs).status, "clear");
});
test("Zero capacity, fractional equipment and excessive calculation do not yield a verdict", () => {
  for (const values of [
    { planned: 4, demand: 20, capacity: 0, existing: 0, reserve: 0 },
    { planned: 4.5, demand: 20, capacity: 1, existing: 0, reserve: 0 },
  ]) {
    const { c, docs } = fixture("equipment", values);
    assert.equal(assessQuantity(c, docs).need, null);
  }
});
function marketFixture() {
  const f = fixture();
  const { c, cite } = f;
  c.updatedAt = "2026-11-02T12:00:00Z";
  c.vat = "included";
  c.delivery = "included";
  c.plannedPrice = cite(400, "plan-price");
  c.quotes = [200, 300, 400].map((value, i) => ({
    id: `q${i}`,
    alias: ["А", "Б", "В"][i],
    independenceGroup: `g${i}`,
    price: cite(value, `price-${i}`),
    date: "2026-11-02",
    specification: c.specification,
    unit: c.unit,
    currency: "KZT",
    vat: "included",
    delivery: "included",
    matches: "yes",
    matchReason: "Тест: сипаттаманы салыстырдық",
  }));
  return f;
}
test("Market: three independent comparable sources give median and deviation", () => {
  const { c, docs } = marketFixture();
  const r = assessMarket(c, docs);
  assert.equal(r.reference, 300);
  assert.ok(Math.abs(r.deviation! - 33.3333) < 0.001);
  assert.equal(r.flag, true);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), null);
});
test("Repeated group, original file or hash is not another independent quote", () => {
  for (const duplicate of ["group", "file", "hash"]) {
    const { c, docs } = marketFixture();
    if (duplicate === "group") c.quotes[1].independenceGroup = "g0";
    if (duplicate === "file") c.quotes[1].price = { ...c.quotes[0].price };
    if (duplicate === "hash")
      docs.find((d) => d.id === "price-1")!.sha256 = docs.find(
        (d) => d.id === "price-0",
      )!.sha256;
    const r = assessMarket(c, docs);
    assert.equal(r.reference, null);
    assert.equal(r.eligible, 2);
  }
});
test("Incompatible spec, unit, taxes, delivery or stale/future date is excluded", () => {
  for (const change of [
    { specification: "other" },
    { unit: "kg" },
    { vat: "excluded" },
    { delivery: "unknown" },
    { date: "2025-01-01" },
    { date: "2026-12-01" },
    { matches: "no" },
  ]) {
    const { c, docs } = marketFixture();
    Object.assign(c.quotes[0], change);
    assert.equal(assessMarket(c, docs).reference, null);
  }
});
test("Removing the planned price proof blocks deviation but keeps supported median", () => {
  const { c, docs } = marketFixture();
  c.plannedPrice.documentId = "";
  assert.equal(assessMarket(c, docs).reference, 300);
  assert.equal(assessMarket(c, docs).deviation, null);
});
test("KRI excludes missing evidence, displays coverage and null denominator", () => {
  const a = fixture(),
    b = fixture();
  b.c.id = "b";
  b.c.inputs.planned.value = null;
  const k = auditKri([a.c, b.c], a.docs);
  assert.deepEqual(k, {
    total: 2,
    complete: 1,
    flagged: 1,
    incomplete: 1,
    percent: 100,
  });
  assert.equal(auditKri([b.c], b.docs).percent, null);
});
test("Five cases do not become complete with a typed role and administrative label", () => {
  const { c, docs } = fixture();
  c.ownerRole = "Approver";
  c.reviewDate = "2026-11-02";
  c.outcomeMetric = "results";
  assert.equal(assessBusinessCase(c, docs).packageComplete, false);
});
test("TCO does not accept invented annual cost absent from cited source", () => {
  const { c, docs, cite } = fixture();
  const evidence = cite(100, "cost", "Бастапқы = 100; жылдық = 0; аяқтау = 0");
  c.options = [
    {
      id: "o",
      label: "Нұсқа",
      kind: "buy",
      outcome: "same",
      meetsNeed: "yes",
      evidence,
      initial: 100,
      annual: 999,
      endCost: 0,
      horizon: 3,
    },
  ];
  const r = assessBusinessCase(c, docs);
  assert.equal(r.options[0].total, null);
  assert.ok(r.options[0].issues.some((x) => x.includes("Жылдық")));
});
test("Schema rejects negative costs, invalid dates and duplicate quote IDs", () => {
  const { c } = marketFixture();
  assert.throws(() => auditCaseSchema.parse({ ...c, periodEnd: "2026-02-30" }));
  assert.throws(() =>
    auditCaseSchema.parse({ ...c, quotes: [c.quotes[0], c.quotes[0]] }),
  );
  assert.throws(() =>
    auditCaseSchema.parse({
      ...c,
      inputs: { ...c.inputs, planned: { ...c.inputs.planned, value: -1 } },
    }),
  );
});
test("Reports escape documents and prompts; CSV escapes formulas; summary uses five sections", () => {
  const { c, docs } = fixture();
  c.title = "<script>alert(1)</script>";
  c.expertNote = '=HYPERLINK("https://example.org")';
  const html = auditReportHtml([c], docs, "real", true);
  assert.ok(!html.includes("<script>alert"));
  assert.equal((html.match(/<section>/g) || []).length, 5);
  assert.ok(html.includes("Дерек"));
  assert.ok(auditResultsCsv([c], docs).includes("'=HYPERLINK"));
});

import {
  officialProgram,
  compareProgramSources,
  programTrialCsv,
} from "../lib/official-program";
test("Real budget program: 12 common cells, 7 mismatches, no permission to use mixed years", () => {
  const r = compareProgramSources();
  assert.equal(r.total, 12);
  assert.equal(r.mismatches, 7);
  assert.equal(r.headerMismatch, true);
  assert.equal(r.usable, false);
  assert.equal(
    r.rows.find((x) => x.key === "budget" && x.year === 2026)?.portal,
    148757,
  );
  assert.equal(
    r.rows.find((x) => x.key === "budget" && x.year === 2026)?.attachment,
    149560,
  );
  assert.ok(programTrialCsv().includes(officialProgram.fileUrl));
});
test("Program comparison returns usable only if years and all values agree", () => {
  const p = structuredClone(officialProgram);
  p.attachmentYears = [...p.portalYears];
  assert.equal(compareProgramSources(p).usable, true);
  p.series[0].attachment[0] += 1;
  assert.equal(compareProgramSources(p).usable, false);
});

test("Document extraction reads text safely and detects fake extensions by bytes", async () => {
  const { detectMime, extractDocument } =
    await import("../lib/document-extraction");
  assert.equal(detectMime(Buffer.from("Жоспар = 20")), "text/plain");
  assert.throws(() => detectMime(Buffer.from([0, 1, 2, 3])));
  const r = await extractDocument(Buffer.from("Жоспар = 20"), "text/plain", 1);
  assert.equal(r.page.text, "Жоспар = 20");
  await assert.rejects(() =>
    extractDocument(Buffer.from("a"), "text/plain", 2),
  );
});

test("A digit substring cannot substantiate a different number", () => {
  const { c, docs } = fixture();
  const v = { ...c.inputs.planned, value: 2, raw: "2" };
  assert.ok(citationIssues(v, docs, "real").length);
});

test("Continuous kg/litre consumption is not rounded as individual pieces", () => {
  const { c, docs } = fixture("consumables", {
    planned: 10.5,
    demand: 3,
    rate: 3.5,
    periods: 1,
    stock: 0,
    incoming: 0,
    reserve: 0,
  });
  c.unit = "кг";
  c.rounding = "continuous";
  let r = assessQuantity(c, docs);
  assert.equal(r.need, 10.5);
  assert.equal(r.status, "clear");
  c.rounding = "discrete";
  r = assessQuantity(c, docs);
  assert.equal(r.need, 11);
});
test("Fractional service packages do not silently pass as complete", () => {
  const { c, docs } = fixture("service", {
    planned: 1.5,
    demand: 10,
    capacity: 5,
    existing: 0,
    reserve: 0,
  });
  assert.equal(assessQuantity(c, docs).need, null);
});
