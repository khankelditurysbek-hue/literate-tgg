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
  return d;
}
