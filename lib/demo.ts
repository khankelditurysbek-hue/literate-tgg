import { newWorkload, officialWorkloadCase } from "./utilization";
import {
  emptyDataset,
  emptyEvidence,
  emptyFinance,
  type Dataset,
  type Request,
} from "./model";
export function demoDataset(): Dataset {
  const d = emptyDataset();
  const now = new Date().toISOString();
  const evidence = {
    ...emptyEvidence(true),
    source: "Шартты дерек — оқу мысалы",
    document: "DEMO түгендеу актісі",
    date: now.slice(0, 10),
    verified: true,
  };
  const r: Request = {
    id: "DEMO-001",
    organization: "Шартты мемлекеттік орган",
    title: "Жұмыс компьютерлері",
    category: "Компьютер",
    plannedQuantity: 20,
    unit: "дана",
    unitPrice: 250000,
    requiredOutcome: "20 қызметкерге жұмыс орнын қамтамасыз ету",
    requiredQuantity: 20,
    horizon: 3,
    evidence,
    justification: "Шартты қажеттілік тізімі",
    inventoryConfirmed: true,
    assets: [
      {
        id: "DEMO-ASSET",
        category: "Компьютер",
        total: 15,
        inUse: 0,
        free: 12,
        repairable: 2,
        unusable: 1,
        suitable: true,
        available: true,
        inspectedAt: now.slice(0, 10),
        inspector: "Оқу мысалындағы рөл",
        evidence,
      },
    ],
    alternatives: [
      {
        id: "DEMO-A",
        name: "Толық жаңа сатып алу",
        kind: "A",
        initial: 5000000,
        installation: 0,
        repair: 0,
        annualMaintenance: 100000,
        annualOperation: 50000,
        replacement: 0,
        other: 0,
        lifetime: 3,
        compliant: true,
        evidence,
      },
      {
        id: "DEMO-C",
        name: "Қолда барын пайдалану және 8 жаңа компьютер",
        kind: "C",
        initial: 2000000,
        installation: 0,
        repair: 0,
        annualMaintenance: 150000,
        annualOperation: 50000,
        replacement: 0,
        other: 0,
        lifetime: 3,
        compliant: true,
        evidence,
      },
    ],
    finance: {
      ...emptyFinance(),
      evidence,
      baselineId: "DEMO-A",
      selectedId: "DEMO-C",
    },
    createdAt: now,
    updatedAt: now,
  };
  d.requests = [r];
  const sourceCase = officialWorkloadCase();
  const low = {
    ...sourceCase,
    id: "DEMO-WORKLOAD-LOW",
    organization: "DEMO · Ресми Шиелі деректеріне негізделген оқу мысалы",
    asset: "DEMO · Эндоскопиялық жүйе",
    evidence: {
      ...sourceCase.evidence,
      reliability: "demo" as const,
      source: "Шартты оқу көшірмесі; сандар ресми аудиттен",
      document: "DEMO оқу мысалы · " + sourceCase.evidence.document,
    },
  };
  const reserve = {
    ...newWorkload("demo"),
    id: "DEMO-WORKLOAD-RESERVE",
    organization: "DEMO · Шартты аурухана",
    asset: "DEMO · Шұғыл резерв аппараты",
    unit: "зерттеу",
    periodStart: "2025-01-01",
    periodEnd: "2025-12-31",
    capacity: 1000,
    actual: 20,
    comparable: "yes" as const,
    basis:
      "Шартты есеп: 250 жұмыс күні × 4 зерттеу = 1000. Бұл нақты ұйымның дерегі емес.",
    sourcePages: "DEMO оқу парағы: қуат пен нақты пайдалану",
    evidence,
    reasons: {
      reserve: "yes" as const,
      staff: "unknown" as const,
      downtime: "unknown" as const,
      referrals: "unknown" as const,
      geography: "unknown" as const,
    },
    expertConclusion:
      "Шартты оқу сценарийі: жүктеме 2%, бірақ шұғыл резерв белгісі бар. Қажеттілікті сарапшы бағалайды; аппаратты қысқарту немесе үнем туралы қорытынды шығарылмайды.",
  };
  const incomplete = {
    ...newWorkload("demo"),
    id: "DEMO-WORKLOAD-INCOMPLETE",
    organization: "DEMO · Шартты мекеме",
    asset: "DEMO · Дерегі толық емес актив",
    unit: "қызмет",
    periodStart: "2025-01-01",
    periodEnd: "2025-12-31",
    capacity: null,
    actual: 100,
    evidence: { ...evidence, verified: false },
    expertConclusion:
      "Оқу мысалы: есептік қуат белгісіз. Жүйе пайызды ойдан есептемейді.",
  };
  d.workloads = [low, reserve, incomplete];
  d.decisions = [
    {
      id: "DEMO-DECISION-001",
      requestId: r.id,
      issue: "DEMO: бастапқы үлгіде 12 дана ықтимал артық көлем",
      evidence: "Шартты түгендеу мысалында 12 жарамды бос компьютер бар",
      proposal:
        "DEMO оқу ұсынысы: 12 бос компьютерді пайдаланып, 8 жаңа компьютер алу нұсқасын қарастыру",
      role: "DEMO сарапшысы — шартты рөл",
      date: now.slice(0, 10),
      status: "accepted",
      reason:
        "Шартты оқу шешімі. Бірдей нәтиже мен салыстырмалы шығындар үлгі деректерге сүйенеді; бұл нақты сатып алу шешімі емес.",
      createdAt: now,
    },
  ];
  d.reviews = [
    {
      id: "DEMO-REVIEW-001",
      requestId: r.id,
      correct: "Оқу мысалында жарамды бос активтер қажеттілікті азайтады.",
      falseAlarm:
        "Шартты бақылау: шұғыл резервтегі активтің төмен жүктемесін автоматты артық көлем деп санауға болмайды.",
      missed: "Нақты өткізіп алған жағдай бұл оқу сценарийінде расталмаған.",
      missing: "Нақты ұйымның бастапқы ішкі құжаттары бұл DEMO жиынында жоқ.",
      expert:
        "DEMO оқу бағалауы: ықтимал айырма нақты үнемге тең емес. Құжат пен қызметтік нәтиже тексерілуі тиіс.",
      createdAt: now,
    },
  ];
  return d;
}

// Only add missing demo IDs. Existing local examples, user edits and settings survive.
export function addMissingDemoExamples(current: Dataset): Dataset {
  const next = structuredClone(current);
  const sample = demoDataset();
  for (const key of [
    "requests",
    "decisions",
    "trials",
    "reviews",
    "iterations",
    "workloads",
  ] as const) {
    const ids = new Set(next[key].map((item) => item.id));
    (next[key] as { id: string }[]).push(
      ...sample[key].filter((item) => !ids.has(item.id)),
    );
  }
  return next;
}
