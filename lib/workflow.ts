import type { Dataset, Request, Stage, Workflow } from "./model";
import { analyze } from "./calculations";
export const stageLabels: Record<Stage, string> = {
  draft: "Жоба",
  submitted: "Ұсынылды",
  review: "Тексерілуде",
  returned: "Толықтыруға қайтарылды",
  approved: "Ішкі келісім берілді",
  rejected: "Қабылданбады",
};
export const nextStages: Record<Stage, Stage[]> = {
  draft: ["submitted"],
  submitted: ["review", "returned"],
  review: ["returned", "approved", "rejected"],
  returned: ["submitted"],
  approved: ["review"],
  rejected: ["draft"],
};
export function validateWorkflow(r: Request) {
  let stage: Stage = "draft";
  let last = "";
  const ids = new Set<string>();
  for (const event of r.workflow.events) {
    if (
      event.from !== stage ||
      (event.to !== stage && !nextStages[stage].includes(event.to))
    )
      throw new Error(`${r.id}: кезең тарихының реті жарамсыз`);
    if (ids.has(event.id) || event.at < last)
      throw new Error(`${r.id}: тарих идентификаторы не уақыты жарамсыз`);
    ids.add(event.id);
    last = event.at;
    stage = event.to;
  }
  if (stage !== r.workflow.stage)
    throw new Error(`${r.id}: кезең мен тарих сәйкес емес`);
  if (stage !== "draft" && (!r.workflow.department || !r.workflow.ownerRole))
    throw new Error("Бөлім мен жауапты рөлді көрсетіңіз");
  if (stage === "approved") {
    const a = analyze(r);
    if (!a.complete)
      throw new Error("Дерегі толық емес өтінімге ішкі келісім берілмейді");
    if (a.flags.length && !r.workflow.events.at(-1)?.acknowledged)
      throw new Error(
        "Ескертулерді қарағаныңызды растаңыз және шешімді негіздеңіз",
      );
  }
}
export function updateWorkflow(
  r: Request,
  metadata: Pick<
    Workflow,
    "stage" | "department" | "ownerRole" | "priority" | "dueDate"
  >,
  role: string,
  note: string,
  acknowledged = false,
): Request {
  if (!role.trim() || note.trim().length < 5)
    throw new Error("Қызметтік рөл мен кемінде 5 таңбалы негіздеме қажет");
  const stamp = new Date().toISOString();
  const next: Request = {
    ...r,
    updatedAt: stamp,
    workflow: {
      ...r.workflow,
      ...metadata,
      events: [
        ...r.workflow.events,
        {
          id: crypto.randomUUID(),
          from: r.workflow.stage,
          to: metadata.stage,
          role: role.trim(),
          note: note.trim(),
          acknowledged,
          at: stamp,
        },
      ],
    },
  };
  validateWorkflow(next);
  return next;
}
export function validateWorkflowChanges(next: Dataset, previous: Dataset) {
  for (const r of next.requests) {
    validateWorkflow(r);
    const old = previous.requests.find((p) => p.id === r.id);
    if (old?.workflow.stage === "approved" && r.workflow.stage === "approved") {
      const domain = (v: Request) => {
        const { workflow, updatedAt, ...rest } = v;
        void workflow;
        void updatedAt;
        return JSON.stringify(rest);
      };
      if (domain(old) !== domain(r))
        throw new Error(
          "Келісілген өтінімнің деректерін өзгертпес бұрын оны Тексерілуде кезеңіне қайтарыңыз",
        );
    }
    if (
      old &&
      JSON.stringify(r.workflow.events.slice(0, old.workflow.events.length)) !==
        JSON.stringify(old.workflow.events)
    )
      throw new Error(
        "Бұрынғы кезең тарихын өзгертуге болмайды. Жаңа оқиға тіркеңіз.",
      );
  }
}
export function workflowCounts(data: Dataset) {
  return Object.fromEntries(
    (Object.keys(stageLabels) as Stage[]).map((stage) => [
      stage,
      data.requests.filter((r) => r.workflow.stage === stage).length,
    ]),
  ) as Record<Stage, number>;
}
