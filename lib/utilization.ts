import { evidenceComplete, WARNING } from "./calculations";
import { emptyEvidence, type Mode, type Workload } from "./model";
export const causeLabels = {
  reserve: "Резервтік / шұғыл медициналық қажеттілік бар ма?",
  staff: "Маман тапшылығы жүктемеге әсер етті ме?",
  downtime: "Жөндеу немесе тоқтап тұру болды ма?",
  referrals: "Жолдама / қызметті ұйымдастыру мәселесі бар ма?",
  geography: "География мен қолжетімділік бөлек қуатты қажет ете ме?",
};
export function utilization(w: Workload) {
  const percentage =
    w.capacity === null || w.actual === null || w.capacity === 0
      ? null
      : (w.actual / w.capacity) * 100;
  const gaps: string[] = [];
  if (w.capacity === null || w.actual === null)
    gaps.push("Есептік қуат немесе нақты пайдалану белгісіз");
  if (w.capacity === 0) gaps.push("Есептік қуат нөл: пайыз есептелмейді");
  if (w.comparable !== "yes")
    gaps.push(
      "Кезең, өлшем бірлігі және көрсеткіштер анықтамасының сәйкестігі расталмаған",
    );
  if (!w.basis) gaps.push("Есептік қуаттың негіздемесі жоқ");
  if (!evidenceComplete(w.evidence) || !w.sourcePages)
    gaps.push("Дереккөз, беттер немесе құжатты тексеру жеткіліксіз");
  const explained = Object.values(w.reasons).some((v) => v === "yes");
  const unknown = Object.entries(w.reasons)
    .filter(([, v]) => v === "unknown")
    .map(([k]) => causeLabels[k as keyof typeof causeLabels]);
  const low = percentage !== null && percentage < w.threshold;
  const status = gaps.length
    ? "Дерек жеткіліксіз"
    : percentage! > 100
      ? "Есептік қуаттан жоғары — негіздемені тексеру"
      : low
        ? explained
          ? "Төмен жүктеме: түсіндірмені сарапшы бағаласын"
          : "Төмен жүктеме: себептерін тексеру қажет"
        : "Жүктеме белгіленген шектен төмен емес";
  return {
    percentage,
    low: gaps.length ? null : low,
    status,
    gaps,
    unknown,
    warning: WARNING,
    conclusion:
      "Бұл көрсеткіш бос актив санын, артық сатып алуды немесе үнем сомасын анықтамайды.",
  };
}
export function newWorkload(mode: Mode): Workload {
  const stamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    organization: "",
    asset: "",
    unit: "",
    periodStart: "",
    periodEnd: "",
    capacity: null,
    actual: null,
    plannedAmount: null,
    threshold: 30,
    comparable: "unknown",
    basis: "",
    sourcePages: "",
    evidence: emptyEvidence(mode === "demo"),
    reasons: {
      reserve: "unknown",
      staff: "unknown",
      downtime: "unknown",
      referrals: "unknown",
      geography: "unknown",
    },
    expertConclusion: "",
    createdAt: stamp,
    updatedAt: stamp,
  };
}
export const sourceCaseId = "AUDIT-4373692-SHIELI-EGDS";
export function officialWorkloadCase(): Workload {
  const w = newWorkload("real");
  return {
    ...w,
    id: sourceCaseId,
    organization: "Шиелі аудандық көп бейінді орталық ауруханасы",
    asset: "Бейне гастроскопы бар эндоскопиялық бейнеақпараттық жүйе",
    unit: "пациент",
    periodStart: "2024-01-01",
    periodEnd: "2026-06-30",
    capacity: 5080,
    actual: 914,
    plannedAmount: 56484700,
    comparable: "yes",
    basis:
      "Аудит кестесінде: (249 + 246 + 140) жұмыс күні × 8 пациент/күн = 5 080. Кестедегі есептік қуат қайта пайдаланылды; жұмыс күндері мен нормативтің қолданыстағы редакциясы тәуелсіз тексерілмеген.",
    sourcePages:
      "Сатып алу өтінімі — 12-бет; жүктеме — 25-бет; бөлімнің жалпы қорытындысы — 33-бет (екінші PDF-тің 3-беті).",
    evidence: {
      source: "Ашық бюджеттер · Қызылорда облысы бойынша тексеру комиссиясы",
      document:
        "2026-10-14 аудиторлық есеп. «Ауылдық денсаулық сақтауды жаңғырту» ұлттық жобасын аралық бағалау",
      url: "https://budget.egov.kz/material/material?id=4373692&govAgencyId=3672",
      date: "2026-11-02",
      reliability: "official",
      verified: true,
    },
    expertConclusion:
      "Аудит 25-бетте пациенттер ағыны мен жолдамаларды ұйымдастыруды жетілдіруді ұсынады. 33-беттегі бөлім қорытындысында бұзушылықтар анықталмағаны жазылған. Бұл жаңа сатып алудың қажеттілігі мен TCO-сының толық талдауы емес. Шекті 30% — қолданбадағы өзгертілетін қарау шегі, аудиттің нормативі емес.",
  };
}
