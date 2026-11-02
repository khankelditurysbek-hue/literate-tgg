import { test } from "node:test";
import assert from "node:assert/strict";
import { demoDataset } from "../lib/demo";
import { datasetSchema, emptyWorkflow, type Request } from "../lib/model";
import {
  updateWorkflow,
  validateWorkflow,
  validateWorkflowChanges,
  workflowCounts,
} from "../lib/workflow";
const fixture = () => {
  const r = structuredClone(demoDataset().requests[0]);
  r.workflow = emptyWorkflow();
  return r;
};
const meta = (stage: Request["workflow"]["stage"]) => ({
  stage,
  department: "IT бөлімі",
  ownerRole: "Сатып алу маманы",
  priority: "normal" as const,
  dueDate: "2026-11-10",
});
test("Кезең: ұсыну, тексеру, ескертулерді растау және ішкі келісім", () => {
  let r = fixture();
  r = updateWorkflow(
    r,
    meta("submitted"),
    "Бөлім маманы",
    "Жаңа орындар қажет",
  );
  r = updateWorkflow(
    r,
    meta("review"),
    "Ішкі бақылаушы",
    "Түгендеу тексерілді",
  );
  assert.throws(
    () => updateWorkflow(r, meta("approved"), "Басшы", "Нұсқа қаралды"),
    /Ескертулер/,
  );
  r = updateWorkflow(
    r,
    meta("approved"),
    "Басшы",
    "Ішінара сатып алу нұсқасы қаралды",
    true,
  );
  assert.equal(r.workflow.stage, "approved");
  assert.equal(r.workflow.events.length, 3);
});
test("Кезең: толық емес өтінім келісімге өтпейді", () => {
  let r = fixture();
  r.requiredQuantity = null;
  r = updateWorkflow(r, meta("submitted"), "Бөлім маманы", "Деректер ұсынылды");
  r = updateWorkflow(r, meta("review"), "Сарапшы", "Тексеру басталды");
  assert.throws(
    () => updateWorkflow(r, meta("approved"), "Басшы", "Өтінімді келісу", true),
    /толық емес/,
  );
});
test("Кезең: қадамды өткізіп келісуге болмайды; жауапты рөл және негіздеме керек", () => {
  const r = fixture();
  assert.throws(
    () => updateWorkflow(r, meta("approved"), "Басшы", "Тікелей келісу", true),
    /реті/,
  );
  assert.throws(
    () =>
      updateWorkflow(
        r,
        { ...meta("submitted"), department: "" },
        "Маман",
        "Қарауды сұрау",
      ),
    /Бөлім/,
  );
  assert.throws(() => updateWorkflow(r, meta("submitted"), "", ""), /рөл/);
});
test("Кезең: толықтыруға қайтару және қайта ұсыну тарихта қалады", () => {
  let r = fixture();
  r = updateWorkflow(r, meta("submitted"), "Маман", "Өтінім түсті");
  r = updateWorkflow(r, meta("returned"), "Сарапшы", "Құжатты толықтыру қажет");
  r = updateWorkflow(
    r,
    meta("submitted"),
    "Маман",
    "Дәлел құжаттары толықтырылды",
  );
  assert.equal(r.workflow.events.length, 3);
  assert.equal(r.workflow.stage, "submitted");
});
test("Кезең: бұрынғы оқиғаны өзгертіп жіберуге болмайды", () => {
  const d = demoDataset();
  const n = structuredClone(d);
  n.requests[1].workflow.events[0].note = "Өзгертілген тарих";
  assert.throws(() => validateWorkflowChanges(n, d), /тарихын/);
});
test("Кеңейтілген DEMO: 10 өтінім, барлық кезең, шартты 10 лот және есептелетін жағдайлар", () => {
  const d = demoDataset();
  assert.equal(datasetSchema.safeParse(d).success, true);
  assert.equal(d.requests.length, 10);
  assert.equal(d.trials.length, 10);
  assert.ok(
    d.trials.every(
      (t) =>
        t.officialId.startsWith("DEMO-") &&
        t.url.startsWith("https://example.org/"),
    ),
  );
  for (const r of d.requests) assert.doesNotThrow(() => validateWorkflow(r));
  const c = workflowCounts(d);
  assert.ok(Object.values(c).every((v) => v > 0));
  assert.equal(
    Object.values(c).reduce((a, b) => a + b),
    10,
  );
});
test("Кезең: ескі өтінімдер жоба кезеңіне үйлесімді көшеді", () => {
  const d = demoDataset();
  const payload = JSON.parse(JSON.stringify(d));
  delete payload.requests[0].workflow;
  const parsed = datasetSchema.parse(payload);
  assert.equal(parsed.requests[0].workflow.stage, "draft");
  assert.equal(parsed.requests[0].workflow.events.length, 0);
});

test("Келісілген өтінімнің сандарын өзгерту үшін қайта қарау кезеңі қажет", () => {
  const before = demoDataset();
  const next = structuredClone(before);
  next.requests.find((r) => r.id === "DEMO-002")!.unitPrice = 190000;
  assert.throws(() => validateWorkflowChanges(next, before), /қайтарыңыз/);
  const r = next.requests.find((r) => r.id === "DEMO-002")!;
  next.requests = next.requests.map((v) =>
    v.id === r.id
      ? updateWorkflow(
          r,
          { ...r.workflow, stage: "review" },
          "Сарапшы",
          "Баға өзгергендіктен қайта қарау",
        )
      : v,
  );
  assert.doesNotThrow(() => validateWorkflowChanges(next, before));
});
