import type { Alternative, Dataset, Evidence, Request } from "./model";
export const WARNING =
  "Ескерту заңбұзушылықтың дәлелі емес. Алгоритм сарапшының шешімін алмастырмайды.";
export const money = (n: number | null) =>
  n === null
    ? "Белгісіз"
    : new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 2 }).format(n) +
      " ₸";
export const plannedCost = (q: number | null, p: number | null) =>
  q === null || p === null ? null : (Math.round(p * 100) * q) / 100;
export const evidenceComplete = (e: Evidence) =>
  Boolean(
    e.source &&
    e.document &&
    e.date &&
    e.verified &&
    e.reliability !== "unverified",
  );
// All annual costs recur at year end. Other, repair and replacement are total costs
// over the common horizon; no discounting, inflation or residual values in v1.
export function tco(a: Alternative, horizon: number): number | null {
  const costs = [
    a.initial,
    a.installation,
    a.repair,
    a.annualMaintenance,
    a.annualOperation,
    a.replacement,
    a.other,
  ];
  if (
    costs.some((x) => x === null) ||
    a.lifetime === null ||
    a.lifetime < horizon
  )
    return null;
  const cents = (v: number) => Math.round(v * 100);
  const total =
    cents(a.initial!) +
    cents(a.installation!) +
    cents(a.repair!) +
    (cents(a.annualMaintenance!) + cents(a.annualOperation!)) * horizon +
    cents(a.replacement!) +
    cents(a.other!);
  return Number.isSafeInteger(total) ? total / 100 : null;
}
export function comparable(a: Alternative | undefined, h: number) {
  return a && a.compliant === true && evidenceComplete(a.evidence)
    ? tco(a, h)
    : null;
}
export function need(r: Request) {
  const reasons: string[] = [];
  if (r.plannedQuantity === null || r.requiredQuantity === null)
    reasons.push("Жоспарланған немесе қажетті саны белгісіз");
  if (!r.inventoryConfirmed)
    reasons.push("Активтер тізілімінің толықтығы расталмаған");
  for (const a of r.assets) {
    if (a.category !== r.category) continue;
    if (
      [
        a.total,
        a.inUse,
        a.free,
        a.repairable,
        a.unusable,
        a.suitable,
        a.available,
      ].some((x) => x === null) ||
      !a.inspector ||
      !a.inspectedAt ||
      !evidenceComplete(a.evidence)
    )
      reasons.push(`${a.category}: активті тексеру деректері жеткіліксіз`);
  }
  if (reasons.length)
    return { available: null, justified: null, excess: null, reasons };
  const available = r.assets
    .filter(
      (a) =>
        a.category === r.category &&
        a.suitable === true &&
        a.available === true,
    )
    .reduce((s, a) => s + a.free!, 0);
  const justified = Math.max(0, r.requiredQuantity! - available);
  return {
    available,
    justified,
    excess: Math.max(0, r.plannedQuantity! - justified),
    reasons,
  };
}
export function analyze(r: Request) {
  const n = need(r);
  const baseline = r.alternatives.find((a) => a.id === r.finance.baselineId);
  const selected = r.alternatives.find((a) => a.id === r.finance.selectedId);
  const base = comparable(baseline, r.horizon),
    chosen = comparable(selected, r.horizon);
  const diff =
    base === null || chosen === null
      ? null
      : Math.max(0, Math.round(base * 100) - Math.round(chosen * 100)) / 100;
  const candidates = r.alternatives
    .map((a) => ({ a, cost: comparable(a, r.horizon) }))
    .filter((v): v is { a: Alternative; cost: number } => v.cost !== null);
  const flags: string[] = [];
  if (n.excess !== null && n.excess > 0)
    flags.push("Жоспарланған саны негізделген қажеттіліктен көп");
  if (
    n.available !== null &&
    n.available > 0 &&
    n.excess !== null &&
    n.excess > 0
  )
    flags.push("Жарамды бос активтерді пайдалану тексерілсін");
  if (!r.justification || !evidenceComplete(r.evidence))
    flags.push("Қажеттілік құжатпен расталмаған");
  if (chosen !== null && candidates.some((a) => a.cost < chosen))
    flags.push("Арзанырақ функционалдық сәйкес балама бар");
  if (candidates.length < 2)
    flags.push("Кемінде екі сәйкес және дәлелденген балама қажет");
  if (diff === null) flags.push("Салыстырмалы шығын туралы дерек жеткіліксіз");
  const complete =
    n.reasons.length === 0 &&
    r.unitPrice !== null &&
    evidenceComplete(r.evidence) &&
    diff !== null &&
    candidates.length >= 2;
  const status = !complete
    ? "Дерек жеткіліксіз"
    : n.excess! > 0
      ? "Ықтимал артық көлем анықталды"
      : flags.length
        ? "Қосымша тексеру қажет"
        : "Негіздеме жеткілікті";
  const proof = Boolean(
    r.finance.baselineDocument &&
    r.finance.approvedChange &&
    r.finance.actualResult &&
    r.finance.outcomePreserved &&
    evidenceComplete(r.finance.evidence) &&
    diff !== null,
  );
  return {
    ...n,
    plannedCost: plannedCost(r.plannedQuantity, r.unitPrice),
    baselineCost: base,
    selectedCost: chosen,
    potentialDifference: diff,
    flags,
    complete,
    status,
    commitmentReduction: proof ? r.finance.commitmentReduction : null,
    confirmedSaving: proof ? r.finance.confirmedSaving : null,
    reducedQuantity: proof ? r.finance.reducedQuantity : null,
    warning: WARNING,
  };
}
export function analytics(data: Dataset) {
  const results = data.requests.map(analyze);
  const complete = results.filter((r) => r.complete);
  const insufficient = complete.filter(
    (r) => r.status !== "Негіздеме жеткілікті",
  ).length;
  const sum = (items: (number | null)[]) =>
    items.every((v) => v === null)
      ? null
      : items.reduce<number>((s, v) => s + (v ?? 0), 0);
  return {
    total: results.length,
    complete: complete.length,
    incomplete: results.length - complete.length,
    kri: complete.length ? (insufficient / complete.length) * 100 : null,
    excess: sum(results.map((r) => r.excess)),
    potential: sum(results.map((r) => r.potentialDifference)),
    saving: sum(results.map((r) => r.confirmedSaving)),
    reduced: sum(results.map((r) => r.reducedQuantity)),
    commitment: sum(results.map((r) => r.commitmentReduction)),
  };
}
export function decisionDays(data: Dataset) {
  const times = data.decisions
    .map((d) => {
      const r = data.requests.find((r) => r.id === d.requestId);
      return r
        ? Math.max(0, (Date.parse(d.date) - Date.parse(r.createdAt)) / 86400000)
        : null;
    })
    .filter((x): x is number => x !== null);
  return times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
}
