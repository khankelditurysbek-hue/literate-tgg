import { z } from "zod";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Күн жарамсыз",
  );
const text = z.string().trim().max(4000);
const link = z.union([
  z.literal(""),
  z.url().refine((v) => /^https?:\/\//.test(v)),
]);
export const citationSchema = z.object({
  value: z.number().finite().min(0).max(1e10).nullable(),
  documentId: z.string().max(100),
  page: z.number().int().min(1).max(500),
  quote: text,
  raw: z.string().max(80),
  context: text,
});
export const blankCitation = (): Citation => ({
  value: null,
  documentId: "",
  page: 1,
  quote: "",
  raw: "",
  context: "",
});
export const inputKeys = [
  "planned",
  "demand",
  "capacity",
  "existing",
  "reserve",
  "rate",
  "periods",
  "stock",
  "incoming",
  "estimate",
] as const;
export type InputKey = (typeof inputKeys)[number];
const numeric = z.number().finite().min(0).max(1e10).nullable();
export const optionSchema = z.object({
  id: z.string().min(1).max(100),
  label: text.min(1),
  kind: z.enum(["buy", "repair", "rent", "reuse", "doNothing"]),
  outcome: text,
  meetsNeed: z.enum(["unknown", "yes", "no"]),
  evidence: citationSchema,
  initial: numeric,
  annual: numeric,
  endCost: numeric,
  horizon: z.number().int().min(1).max(30),
});
export const quoteSchema = z.object({
  id: z.string().min(1).max(100),
  alias: z
    .string()
    .regex(/^[А-ЯA-ZӘІҢҒҮҰҚӨҺ][\wА-Яа-яӘәІіҢңҒғҮүҰұҚқӨөҺһ -]{0,30}$/),
  independenceGroup: z.string().trim().max(100),
  price: citationSchema,
  date,
  specification: text,
  unit: text,
  currency: z.enum(["KZT"]),
  vat: z.enum(["included", "excluded", "unknown"]),
  delivery: z.enum(["included", "excluded", "unknown"]),
  matches: z.enum(["unknown", "yes", "no"]),
  matchReason: text,
});
export const auditCaseSchema = z
  .object({
    id: z.string().min(1).max(100),
    mode: z.enum(["real", "demo"]),
    title: text.min(1),
    profile: z.enum(["equipment", "consumables", "service", "works"]),
    unit: text.min(1),
    rounding: z.enum(["discrete", "continuous"]).default("discrete"),
    periodStart: date,
    periodEnd: date,
    outcome: text,
    specification: text,
    inputs: z.object({
      planned: citationSchema,
      demand: citationSchema,
      capacity: citationSchema,
      existing: citationSchema,
      reserve: citationSchema,
      rate: citationSchema,
      periods: citationSchema,
      stock: citationSchema,
      incoming: citationSchema,
      estimate: citationSchema,
    }),
    plannedPrice: citationSchema,
    vat: z.enum(["included", "excluded", "unknown"]),
    delivery: z.enum(["included", "excluded", "unknown"]),
    marketThreshold: z.number().min(5).max(100),
    maxQuoteAge: z.number().int().min(1).max(365),
    quotes: z.array(quoteSchema).max(100),
    options: z.array(optionSchema).max(20),
    strategy: text,
    marketNote: text,
    financeNote: text,
    ownerRole: text,
    reviewDate: z.union([z.literal(""), date]),
    outcomeMetric: text,
    expertNote: text,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((v, ctx) => {
    if (v.periodEnd < v.periodStart)
      ctx.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Кезең күндерін тексеріңіз",
      });
    for (const key of ["quotes", "options"] as const)
      if (new Set(v[key].map((x) => x.id)).size !== v[key].length)
        ctx.addIssue({ code: "custom", path: [key], message: "ID қайталанды" });
  });
export const auditSetSchema = z
  .object({ cases: z.array(auditCaseSchema).max(1000) })
  .superRefine((v, ctx) => {
    if (new Set(v.cases.map((x) => x.id)).size !== v.cases.length)
      ctx.addIssue({
        code: "custom",
        path: ["cases"],
        message: "ID қайталанды",
      });
  });
export type Citation = z.infer<typeof citationSchema>;
export type AuditCase = z.infer<typeof auditCaseSchema>;
export type MarketQuote = z.infer<typeof quoteSchema>;
export type BusinessOption = z.infer<typeof optionSchema>;
export type AuditSet = z.infer<typeof auditSetSchema>;
export type SourcePage = {
  page: number;
  text: string;
  method: "text" | "ocr";
  confidence: number | null;
};
export type SourceDocument = {
  id: string;
  mode: "real" | "demo";
  name: string;
  mime: string;
  size: number;
  sha256: string;
  source: string;
  url: string;
  date: string;
  origin: "official" | "internal" | "market" | "demo";
  uploadedAt: string;
  pages: SourcePage[];
  totalPages: number;
};
export const documentMetaSchema = z.object({
  source: text.min(1),
  url: link,
  date,
  origin: z.enum(["official", "internal", "market", "demo"]),
});
export function newAuditCase(
  mode: "real" | "demo",
  profile: AuditCase["profile"] = "equipment",
): AuditCase {
  const at = new Date().toISOString(),
    day = at.slice(0, 10);
  return {
    id: crypto.randomUUID(),
    mode,
    title: "Жаңа тексеру",
    profile,
    unit: "дана",
    rounding: profile === "works" ? "continuous" : "discrete",
    periodStart: day,
    periodEnd: day,
    outcome: "",
    specification: "",
    inputs: Object.fromEntries(
      inputKeys.map((k) => [k, blankCitation()]),
    ) as AuditCase["inputs"],
    plannedPrice: blankCitation(),
    vat: "unknown",
    delivery: "unknown",
    marketThreshold: 25,
    maxQuoteAge: 90,
    quotes: [],
    options: [],
    strategy: "",
    marketNote: "",
    financeNote: "",
    ownerRole: "",
    reviewDate: "",
    outcomeMetric: "",
    expertNote: "",
    createdAt: at,
    updatedAt: at,
  };
}
