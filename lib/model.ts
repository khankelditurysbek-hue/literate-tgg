import { z } from "zod";
const text = z.string().trim().min(1, "Міндетті өріс").max(2000);
const short = z.string().trim().max(2000);
const money = z
  .number()
  .finite()
  .min(0)
  .max(1e12)
  .refine(
    (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.02,
    "Екі ондық таңбадан артық енгізбеңіз",
  )
  .nullable();
const qty = z.number().int().min(0).max(1e7).nullable();
const date = z
  .string()
  .refine(
    (v) =>
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Күнді дұрыс енгізіңіз",
  );
const url = z.union([
  z.literal(""),
  z.url().refine((v) => /^https?:\/\//.test(v), "HTTP/HTTPS сілтемесі қажет"),
]);
export const evidenceSchema = z.object({
  source: short,
  document: short,
  url,
  date: z.union([z.literal(""), date]),
  reliability: z.enum(["official", "documented", "unverified", "demo"]),
  verified: z.boolean(),
});
export const assetSchema = z
  .object({
    id: text,
    category: text,
    total: qty,
    inUse: qty,
    free: qty,
    repairable: qty,
    unusable: qty,
    suitable: z.boolean().nullable(),
    available: z.boolean().nullable(),
    inspectedAt: z.union([z.literal(""), date]),
    inspector: short,
    evidence: evidenceSchema,
  })
  .superRefine((v, ctx) => {
    const parts = [v.inUse, v.free, v.repairable, v.unusable];
    if (
      v.total !== null &&
      parts.every((x) => x !== null) &&
      parts.reduce<number>((s, x) => s + (x ?? 0), 0) !== v.total
    )
      ctx.addIssue({
        code: "custom",
        message: "Актив санаттарының қосындысы жалпы санға тең болуы тиіс",
        path: ["total"],
      });
  });
export const alternativeSchema = z.object({
  id: text,
  name: text,
  kind: z.enum(["A", "B", "C", "D", "E"]),
  initial: money,
  installation: money,
  repair: money,
  annualMaintenance: money,
  annualOperation: money,
  replacement: money,
  other: money,
  lifetime: z.number().int().min(1).max(50).nullable(),
  compliant: z.boolean().nullable(),
  evidence: evidenceSchema,
});
export const financeSchema = z.object({
  baselineId: short,
  selectedId: short,
  baselineDocument: short,
  approvedChange: short,
  actualResult: short,
  outcomePreserved: z.boolean(),
  commitmentReduction: money,
  confirmedSaving: money,
  reducedQuantity: qty,
  evidence: evidenceSchema,
});
export const requestSchema = z
  .object({
    id: text,
    organization: text,
    title: text,
    category: text,
    plannedQuantity: qty,
    unit: text,
    unitPrice: money,
    requiredOutcome: text,
    requiredQuantity: qty,
    horizon: z.number().int().min(1).max(50),
    evidence: evidenceSchema,
    justification: short,
    inventoryConfirmed: z.boolean(),
    assets: z.array(assetSchema).max(1000),
    alternatives: z.array(alternativeSchema).max(100),
    finance: financeSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((v, ctx) => {
    if (
      v.plannedQuantity !== null &&
      v.unitPrice !== null &&
      v.plannedQuantity * v.unitPrice > Number.MAX_SAFE_INTEGER / 100
    )
      ctx.addIssue({
        code: "custom",
        path: ["unitPrice"],
        message: "Жоспарланған сома қауіпсіз есептеу шегінен асып кетті",
      });
    for (const key of ["assets", "alternatives"] as const)
      if (new Set(v[key].map((x) => x.id)).size !== v[key].length)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Идентификатор қайталанды",
        });
    for (const key of ["baselineId", "selectedId"] as const)
      if (
        v.finance[key] &&
        !v.alternatives.some((a) => a.id === v.finance[key])
      )
        ctx.addIssue({
          code: "custom",
          path: ["finance", key],
          message: "Балама табылмады",
        });
  });
export const decisionSchema = z.object({
  id: text,
  requestId: text,
  issue: text,
  evidence: text,
  proposal: text,
  role: text,
  date,
  status: z.enum(["accepted", "rejected"]),
  reason: text,
  createdAt: z.iso.datetime(),
});
export const trialSchema = z.object({
  id: text,
  type: z.enum(["lot", "program", "protocol"]),
  officialId: text,
  title: text,
  url: z.url().refine((v) => /^https?:\/\//.test(v)),
  date,
  plannedQuantity: qty,
  unitPrice: money,
  requestId: short,
  notes: short,
});
export const reviewSchema = z.object({
  id: text,
  requestId: text,
  correct: short,
  falseAlarm: short,
  missed: short,
  missing: short,
  expert: text,
  createdAt: z.iso.datetime(),
});
export const iterationSchema = z.object({
  id: text,
  prompt: text,
  decision: text,
  checks: text,
  changes: text,
  createdAt: z.iso.datetime(),
});
export const settingsSchema = z.object({
  lectureTool: short,
  owner: short,
  frequency: short,
  rollout: short,
});
export const workloadSchema = z
  .object({
    id: text,
    organization: text,
    asset: text,
    unit: text,
    periodStart: date,
    periodEnd: date,
    capacity: qty,
    actual: qty,
    plannedAmount: money,
    threshold: z.number().finite().min(1).max(100),
    comparable: z.enum(["unknown", "yes", "no"]),
    basis: short,
    sourcePages: short,
    evidence: evidenceSchema,
    reasons: z.object({
      reserve: z.enum(["unknown", "yes", "no"]),
      staff: z.enum(["unknown", "yes", "no"]),
      downtime: z.enum(["unknown", "yes", "no"]),
      referrals: z.enum(["unknown", "yes", "no"]),
      geography: z.enum(["unknown", "yes", "no"]),
    }),
    expertConclusion: short,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((v, ctx) => {
    if (v.periodEnd < v.periodStart)
      ctx.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Кезеңнің соңы басталуынан бұрын болмауы тиіс",
      });
  });
export type Workload = z.infer<typeof workloadSchema>;
export const datasetSchema = z
  .object({
    requests: z.array(requestSchema).max(10000),
    decisions: z.array(decisionSchema).max(20000),
    trials: z.array(trialSchema).max(10000),
    reviews: z.array(reviewSchema).max(10000),
    iterations: z.array(iterationSchema).max(10000),
    settings: settingsSchema,
    workloads: z.array(workloadSchema).max(10000).default([]),
  })
  .superRefine((v, ctx) => {
    for (const key of [
      "requests",
      "decisions",
      "trials",
      "reviews",
      "iterations",
      "workloads",
    ] as const)
      if (new Set(v[key].map((x) => x.id)).size !== v[key].length)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Идентификатор қайталанды",
        });
    if (
      new Set(v.trials.map((t) => t.type + ":" + t.officialId)).size !==
      v.trials.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["trials"],
        message: "Ресми идентификатор қайталанды",
      });
    for (const key of ["decisions", "reviews", "trials"] as const)
      for (const item of v[key])
        if (item.requestId && !v.requests.some((r) => r.id === item.requestId))
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Байланысты өтінім табылмады",
          });
  });
export type Evidence = z.infer<typeof evidenceSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type Alternative = z.infer<typeof alternativeSchema>;
export type Request = z.infer<typeof requestSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
export type Mode = "real" | "demo";
export const emptyEvidence = (demo = false): Evidence => ({
  source: "",
  document: "",
  url: "",
  date: "",
  reliability: demo ? "demo" : "unverified",
  verified: false,
});
export const emptyFinance = (): Request["finance"] => ({
  baselineId: "",
  selectedId: "",
  baselineDocument: "",
  approvedChange: "",
  actualResult: "",
  outcomePreserved: false,
  commitmentReduction: null,
  confirmedSaving: null,
  reducedQuantity: null,
  evidence: emptyEvidence(),
});
export const emptyDataset = (): Dataset => ({
  requests: [],
  decisions: [],
  trials: [],
  reviews: [],
  iterations: [],
  workloads: [],
  settings: { lectureTool: "", owner: "", frequency: "", rollout: "" },
});
export function checkMode(data: Dataset, mode: Mode) {
  const evidence = data.requests.flatMap((r) => [
    r.evidence,
    ...r.assets.map((a) => a.evidence),
    ...r.alternatives.map((a) => a.evidence),
    r.finance.evidence,
  ]);
  evidence.push(...data.workloads.map((w) => w.evidence));
  if (
    evidence.some((e) =>
      mode === "real" ? e.reliability === "demo" : e.reliability !== "demo",
    )
  )
    throw new Error("Нақты және DEMO деректерін араластыруға болмайды");
}
