import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  analytics,
  need,
  plannedCost,
  tco,
  WARNING,
} from "../lib/calculations";
import { demoDataset } from "../lib/demo";
import {
  checkMode,
  datasetSchema,
  emptyDataset,
  requestSchema,
} from "../lib/model";
import {
  csv,
  importRows,
  mergeRequests,
  readFile,
  requestRows,
  xlsx,
  requestColumns,
} from "../lib/files";
import { buildReport } from "../lib/report";
const fixture = () => structuredClone(demoDataset().requests[0]);
test("1. Жоспарланған сома, нөл және белгісіз мән", () => {
  assert.equal(plannedCost(20, 250000), 5000000);
  assert.equal(plannedCost(null, 100), null);
  assert.equal(plannedCost(0, 100), 0);
});
test("2. Негізделген жаңа саны", () => {
  const a = need(fixture());
  assert.equal(a.available, 12);
  assert.equal(a.justified, 8);
});
test("3. Ықтимал артық көлем және төменгі шек", () => {
  const r = fixture();
  assert.equal(need(r).excess, 12);
  r.requiredQuantity = 5;
  assert.equal(need(r).justified, 0);
  assert.equal(need(r).excess, 20);
});
test("4. Жарамсыз, бос емес және сәйкес емес активтер шегерілмейді", () => {
  const r = fixture();
  r.assets[0].suitable = false;
  assert.equal(need(r).available, 0);
  r.assets[0].suitable = true;
  r.assets[0].available = false;
  assert.equal(need(r).available, 0);
  r.assets[0].available = true;
  r.assets[0].free = 0;
  r.assets[0].inUse = 12;
  assert.equal(need(r).available, 0);
});
test("5. Дерек жеткіліксіз болғанда қорытынды жоқ", () => {
  const r = fixture();
  r.assets[0].available = null;
  assert.equal(need(r).justified, null);
  assert.equal(analyze(r).status, "Дерек жеткіліксіз");
  r.assets[0].available = true;
  r.inventoryConfirmed = false;
  assert.equal(need(r).available, null);
});
test("6. Сәйкес емес арзан балама тиімді деп көрсетілмейді", () => {
  const r = fixture();
  r.alternatives[1].compliant = false;
  assert.equal(analyze(r).selectedCost, null);
  assert.equal(analyze(r).potentialDifference, null);
  assert.equal(analyze(r).confirmedSaving, null);
});
test("7. Ортақ мерзімдегі TCO және мерзім шектеуі", () => {
  const r = fixture();
  assert.equal(tco(r.alternatives[0], 3), 5450000);
  assert.equal(tco(r.alternatives[1], 3), 2600000);
  assert.equal(analyze(r).potentialDifference, 2850000);
  r.alternatives[1].lifetime = 2;
  assert.equal(tco(r.alternatives[1], 3), null);
  r.alternatives[0].repair = null;
  assert.equal(tco(r.alternatives[0], 3), null);
});
test("8. KRI тек толық тексерілген өтінімдермен есептеледі", () => {
  const data = emptyDataset();
  data.requests = [fixture()];
  const incomplete = fixture();
  incomplete.id = "incomplete";
  incomplete.requiredQuantity = null;
  const good = fixture();
  good.id = "good";
  good.plannedQuantity = 8;
  data.requests.push(incomplete, good);
  assert.equal(analytics(data).kri, 50);
  assert.equal(analytics(data).complete, 2);
  assert.equal(analytics(data).incomplete, 1);
});
test("9. Нөлдік бөлгіште KRI жоқ; бос дерек нөлдік үнем емес", () => {
  assert.equal(analytics(emptyDataset()).kri, null);
  assert.equal(analytics(emptyDataset()).saving, null);
});
test("10. Нақты және DEMO деректері араласпайды", () => {
  assert.doesNotThrow(() => checkMode(demoDataset(), "demo"));
  assert.throws(() => checkMode(demoDataset(), "real"));
  const d = demoDataset();
  d.requests[0].evidence.reliability = "official";
  assert.throws(() => checkMode(d, "demo"));
});
test("11. Ескерту заңбұзушылықтың дәлелі емес", () => {
  assert.equal(analyze(fixture()).warning, WARNING);
  assert.match(WARNING, /заңбұзушылықтың дәлелі емес/);
  assert.equal(analyze(fixture()).status, "Ықтимал артық көлем анықталды");
});
test("12. Импорт сандарды және күндерді тексереді", () => {
  const rows = requestRows(demoDataset());
  rows[0].unitPrice = -1;
  assert.throws(() => importRows(rows, "requests", "demo"));
  const valid = requestRows(demoDataset());
  valid[0].plannedQuantity = "" as never;
  const result = importRows(valid, "requests", "demo");
  assert.equal((result[0] as ReturnType<typeof fixture>).plannedQuantity, null);
  valid[0].date = "2026-02-30";
  assert.throws(() => importRows(valid, "requests", "demo"));
});
test("13. Түгендеу бөліктері, теріс мәндер және қайталанған ID қабылданбайды", () => {
  const r = fixture();
  r.assets[0].free = 99;
  assert.equal(requestSchema.safeParse(r).success, false);
  const d = demoDataset();
  d.requests.push(fixture());
  assert.equal(datasetSchema.safeParse(d).success, false);
});
test("14. Қаржылық міндеттеме мен нақты үнем дәлелдерсіз расталмайды", () => {
  const r = fixture();
  r.finance.confirmedSaving = 100;
  r.finance.commitmentReduction = 200;
  assert.equal(analyze(r).confirmedSaving, null);
  r.finance.baselineDocument = "Бастапқы құжат";
  r.finance.approvedChange = "Бекітілген өзгеріс";
  r.finance.actualResult = "Нақты нәтиже";
  r.finance.outcomePreserved = true;
  assert.equal(analyze(r).confirmedSaving, 100);
  assert.equal(analyze(r).commitmentReduction, 200);
});
test("15. CSV және XLSX экспорт-импорт толық өтінімді сақтайды", async () => {
  const data = demoDataset();
  const rows = requestRows(data);
  const csvRows = await readFile(
    Buffer.from(csv(rows, requestColumns)),
    "test.csv",
  );
  assert.deepEqual(importRows(csvRows, "requests", "demo"), data.requests);
  const bytes = await xlsx(rows, requestColumns);
  assert.deepEqual(
    importRows(await readFile(bytes, "test.xlsx"), "requests", "demo"),
    data.requests,
  );
});
test("16. CSV формула инъекциясынан қорғау", () => {
  const result = csv([{ id: "=1+1" }], ["id"]);
  assert.match(result, /'=1\+1/);
});
test("17. Импорт бар өтінімді үнсіз ауыстырмайды", () => {
  const data = demoDataset();
  assert.throws(() => mergeRequests(data, [fixture()]));
});
test("18. Есеп HTML мәтінін қауіпсіз шығарады, тексерілмеген деректі ашық көрсетеді", () => {
  const data = demoDataset();
  data.requests[0].title = "<script>alert(1)</script>";
  data.trials = [];
  const report = buildReport(data, "demo");
  assert.ok(!report.includes("<script>"));
  assert.match(report, /&lt;script&gt;/);
  assert.match(report, /қайта тексерілуі қажет/);
  assert.match(report, /Нақты сынақ өткізілмеген/);
});
test("19. Ресми лоттың ашық дерегі ішкі деректерсіз қажеттілік қорытындысын бермейді", () => {
  assert.throws(() =>
    importRows(
      [
        {
          id: "1",
          type: "lot",
          officialId: "1",
          title: "Лот",
          url: "javascript:alert(1)",
          date: "2026-01-01",
        },
      ],
      "trials",
      "real",
    ),
  );
  const [t] = importRows(
    [
      {
        id: "1",
        type: "lot",
        officialId: "1",
        title: "Лот",
        url: "https://goszakup.gov.kz",
        date: "2026-01-01",
      },
    ],
    "trials",
    "real",
  );
  assert.equal("plannedQuantity" in t ? t.plannedQuantity : undefined, null);
});

test("20. Ақша тиынмен есептеледі және артық дәлдік қабылданбайды", () => {
  assert.equal(plannedCost(3, 0.1), 0.3);
  const r = fixture();
  r.unitPrice = 0.001;
  assert.equal(requestSchema.safeParse(r).success, false);
  r.unitPrice = 1e12;
  r.plannedQuantity = 1e7;
  assert.equal(requestSchema.safeParse(r).success, false);
});
test("21. Жалғыз балама толық тексеруге жеткіліксіз", () => {
  const r = fixture();
  r.alternatives = r.alternatives.slice(0, 1);
  r.finance.selectedId = r.finance.baselineId;
  assert.equal(analyze(r).complete, false);
});
test("22. Импорт DEMO дәлелін нақты дерекке өткізбейді", () => {
  assert.throws(() =>
    importRows(requestRows(demoDataset()), "requests", "real"),
  );
});
