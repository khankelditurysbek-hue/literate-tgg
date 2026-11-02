import { test } from "node:test";
import assert from "node:assert/strict";
import { officialWorkloadCase, utilization } from "../lib/utilization";
import {
  datasetSchema,
  emptyDataset,
  checkMode,
  workloadSchema,
} from "../lib/model";
import { analytics } from "../lib/calculations";
import { buildReport } from "../lib/report";
test("Жүктеме: Шиелі ресми кейсінің 914/5080 есебі 17.99%", () => {
  const w = officialWorkloadCase();
  assert.equal(workloadSchema.safeParse(w).success, true);
  assert.equal(utilization(w).percentage?.toFixed(2), "17.99");
  assert.equal(utilization(w).low, true);
  assert.match(utilization(w).status, /себептерін тексеру/);
});
test("Жүктеме: нөлдік бөлім және белгісіз дерек нөл пайызға айналмайды", () => {
  const w = officialWorkloadCase();
  w.capacity = 0;
  assert.equal(utilization(w).percentage, null);
  assert.equal(utilization(w).low, null);
  w.capacity = null;
  assert.equal(utilization(w).percentage, null);
  w.capacity = 5080;
  w.actual = null;
  assert.equal(utilization(w).percentage, null);
  w.actual = 0;
  assert.equal(utilization(w).percentage, 0);
});
test("Жүктеме: кезең сәйкестігі немесе дәлел жеткіліксіз болса белгі берілмейді", () => {
  const w = officialWorkloadCase();
  w.comparable = "no";
  assert.equal(utilization(w).low, null);
  w.comparable = "yes";
  w.evidence.verified = false;
  assert.equal(utilization(w).low, null);
});
test("Жүктеме: шұғыл резерв анықталса автоматты артық сатып алу қорытындысы жоқ", () => {
  const w = officialWorkloadCase();
  w.reasons.reserve = "yes";
  assert.match(utilization(w).status, /сарапшы/);
  assert.equal("confirmedSaving" in utilization(w), false);
  assert.equal("excess" in utilization(w), false);
});
test("Жүктеме: жоғары пайыз 100%-да қиылмайды және тиімділік деп жарияланбайды", () => {
  const w = officialWorkloadCase();
  w.actual = 6000;
  assert.ok(utilization(w).percentage! > 100);
  assert.match(utilization(w).status, /негіздемені тексеру/);
  w.actual = 4000;
  assert.match(utilization(w).status, /төмен емес/);
});
test("Жүктеме: шек пен мерзім валидациясы, қайталанған ID", () => {
  const w = officialWorkloadCase();
  w.threshold = 0;
  assert.equal(workloadSchema.safeParse(w).success, false);
  w.threshold = 30;
  w.periodEnd = "2023-01-01";
  assert.equal(workloadSchema.safeParse(w).success, false);
  const d = emptyDataset();
  d.workloads = [officialWorkloadCase(), officialWorkloadCase()];
  assert.equal(datasetSchema.safeParse(d).success, false);
});
test("Жүктеме: ескі дерек жиыны деректерін сақтап жаңартылады", () => {
  const old = {
    requests: [],
    decisions: [],
    trials: [
      {
        id: "LOT1",
        type: "lot",
        officialId: "86380456-ЗЦП2",
        title: "Компьютер",
        url: "https://old.goszakup.gov.kz/ru/announce/index/17896644",
        date: "2026-11-02",
        plannedQuantity: 26,
        unitPrice: 330800,
        requestId: "",
        notes: "Сақталуы тиіс",
      },
    ],
    reviews: [],
    iterations: [],
    settings: { lectureTool: "", owner: "", frequency: "", rollout: "" },
  };
  const d = datasetSchema.parse(old);
  assert.deepEqual(d.workloads, []);
  assert.equal(d.trials[0].notes, "Сақталуы тиіс");
});
test("Жүктеме: негізгі KRI, DEMO және қаржы нәтижелері оқшауланған", () => {
  const d = emptyDataset();
  d.workloads = [officialWorkloadCase()];
  assert.equal(analytics(d).kri, null);
  assert.equal(analytics(d).saving, null);
  assert.doesNotThrow(() => checkMode(d, "real"));
  assert.throws(() => checkMode(d, "demo"));
});
test("Жүктеме: есептегі қосымша мен HTML қауіпсіздігі", () => {
  const d = emptyDataset();
  d.workloads = [officialWorkloadCase()];
  d.workloads[0].asset = "<script>alert(1)</script>";
  const html = buildReport(d, "real");
  assert.match(html, /17.99%/);
  assert.match(html, /5 \/ 5/);
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes("<script>"));
});

test("DEMO: төмен жүктеме, резерв және дерек жетіспеушілігі дайын енгізілген", async () => {
  const { demoDataset } = await import("../lib/demo");
  const d = demoDataset();
  assert.equal(datasetSchema.safeParse(d).success, true);
  assert.doesNotThrow(() => checkMode(d, "demo"));
  assert.throws(() => checkMode(d, "real"));
  assert.equal(d.workloads.length, 3);
  assert.equal(utilization(d.workloads[0]).percentage?.toFixed(2), "17.99");
  assert.match(utilization(d.workloads[1]).status, /сарапшы/);
  assert.equal(utilization(d.workloads[2]).percentage, null);
  assert.equal(d.decisions.length, 1);
  assert.equal(d.reviews.length, 1);
  assert.equal(d.iterations.length, 0);
});
test("DEMO seed бұрынғы түзетулер мен жазбаларды сақтайды және қайталағанда өзгермейді", async () => {
  const { demoDataset, addMissingDemoExamples } = await import("../lib/demo");
  const d = demoDataset();
  d.requests[0].title = "Пайдаланушының түзетуі";
  d.settings.lectureTool = "Сақталуы тиіс";
  d.workloads = [];
  const next = addMissingDemoExamples(d);
  assert.equal(next.requests[0].title, "Пайдаланушының түзетуі");
  assert.equal(next.settings.lectureTool, "Сақталуы тиіс");
  assert.equal(next.workloads.length, 3);
  assert.deepEqual(addMissingDemoExamples(next), next);
});
