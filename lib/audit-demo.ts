import {
  newAuditCase,
  type AuditCase,
  type Citation,
  type SourceDocument,
} from "./audit-model";
import {
  addDocument,
  getDocument,
  listDocuments,
  loadAudit,
  saveAudit,
} from "./audit-storage";
export function seedAuditDemo() {
  const current = loadAudit("demo"),
    cases: AuditCase[] = [];
  const date = new Date().toISOString().slice(0, 10);
  function doc(id: string, name: string, text: string) {
    let d = getDocument(id, "demo")?.meta;
    if (!d)
      d = addDocument(
        {
          mode: "demo",
          name,
          mime: "text/plain",
          source: "Шартты оқу сценарийі — нақты ұйым немесе баға емес",
          url: "",
          date,
          origin: "demo",
          pages: [{ page: 1, text, method: "text", confidence: null }],
          totalPages: 1,
        },
        Buffer.from(text),
        id,
      );
    return d;
  }
  function cite(d: SourceDocument, value: number, line: string): Citation {
    return {
      value,
      documentId: d.id,
      page: 1,
      quote: line,
      raw: String(value),
      context:
        "DEMO: осы сценарийдің бір кезеңіне, өлшеміне және сипаттамасына қатысты. Нақты құжат емес.",
    };
  }
  const samples: {
    id: string;
    title: string;
    profile: AuditCase["profile"];
    values: Partial<Record<keyof AuditCase["inputs"], number>>;
    unit: string;
    price: number;
  }[] = [
    {
      id: "DEMO-V2-001",
      title: "20 жұмыс орнына компьютер қажеттілігі",
      profile: "equipment",
      unit: "дана",
      price: 330000,
      values: {
        planned: 20,
        demand: 20,
        capacity: 1,
        existing: 12,
        reserve: 0,
      },
    },
    {
      id: "DEMO-V2-002",
      title: "Шығын материалы: қалдықты қайта сатып алу",
      profile: "consumables",
      unit: "дана",
      price: 1200,
      values: {
        planned: 1000,
        demand: 100,
        rate: 2,
        periods: 3,
        stock: 100,
        incoming: 100,
        reserve: 0,
      },
    },
    {
      id: "DEMO-V2-003",
      title: "Қызмет пакеті: ішкі қуатты есепке алу",
      profile: "service",
      unit: "пакет",
      price: 80000,
      values: {
        planned: 12,
        demand: 1200,
        capacity: 120,
        existing: 480,
        reserve: 1,
      },
    },
    {
      id: "DEMO-V2-004",
      title: "Жөндеу: бір сметалық жол көлемі",
      profile: "works",
      unit: "м²",
      price: 15000,
      values: { planned: 120, estimate: 100 },
    },
    {
      id: "DEMO-V2-005",
      title: "Жалған дабылды бақылау: негізделген резерв",
      profile: "equipment",
      unit: "дана",
      price: 500000,
      values: { planned: 4, demand: 40, capacity: 40, existing: 0, reserve: 3 },
    },
    {
      id: "DEMO-V2-006",
      title: "Құжатсыз қажеттілік — қорытынды шығарылмайды",
      profile: "equipment",
      unit: "дана",
      price: 200000,
      values: { planned: 10, demand: 10, capacity: 1, existing: 0, reserve: 0 },
    },
  ];
  for (const s of samples) {
    const c = newAuditCase("demo", s.profile);
    Object.assign(c, {
      id: s.id,
      title: s.title,
      unit: s.unit,
      outcome:
        "Шартты қызметті белгіленген көлемде, сапада және кезеңде қамтамасыз ету",
      specification: `DEMO стандарт ${s.profile}: бірдей жинақтама, кепілдік, кезең`,
      strategy:
        "Оқу кейсі. Қызмет нәтижесін актив санынан ажырату; қордағы ресурсты және негізделген резервті есептеу.",
      marketNote:
        "А, Б, В — бөлек шартты көздер. Тәуелсіздік туралы белгі заңды тұлғалардың байланысын анықтамайды.",
      financeNote:
        "Оқу есебі: бастапқы, жылдық және кезең соңындағы шығындар бір мерзімде. Нақты қаржы міндеттемесі емес.",
      ownerRole: "DEMO — талдаушы бөлім",
      reviewDate: date,
      outcomeMetric:
        "Сатып алудан кейінгі кезеңде орындалған қызмет саны және бос қор",
      expertNote: s.id.endsWith("005")
        ? "Жүктеме аз болғанымен, 3 резерв бірлігі қажет деп негізделген. Резервті ескермегенде жалған дабыл шығар еді."
        : "DEMO мәндер нақты дерекпен алмастырылмайынша далалық сынақ болып есептелмейді.",
      vat: "included",
      delivery: "included",
    });
    const lines = Object.entries(s.values).map(([k, v]) => `${k} = ${v}`);
    lines.push(`Бірлік баға = ${s.price}`);
    const source = doc(
      `${s.id}-needs`,
      `${s.id}-need.txt`,
      "DEMO / ШАРТТЫ ДЕРЕК\n" + lines.join("\n"),
    );
    for (const [k, v] of Object.entries(s.values))
      c.inputs[k as keyof typeof c.inputs] = cite(source, v, `${k} = ${v}`);
    c.plannedPrice = cite(source, s.price, `Бірлік баға = ${s.price}`);
    if (s.id.endsWith("006")) c.inputs.existing.documentId = "";
    for (let i = 0; i < 4; i++) {
      const value = Math.round(s.price * [0.72, 0.75, 0.78, 0.4][i]),
        line = `Бірлік баға = ${value}`;
      const market = doc(
        `${s.id}-market-${i}`,
        `${s.id}-offer-${i}.txt`,
        `DEMO\n${line}\n${c.specification}\nҚҚС және жеткізу қосылған`,
      );
      c.quotes.push({
        id: `quote-${i}`,
        alias: ["А", "Б", "В", "Г"][i],
        independenceGroup: i === 3 ? "топ-0" : `топ-${i}`,
        price: cite(market, value, line),
        date,
        specification: c.specification,
        unit: c.unit,
        currency: "KZT",
        vat: "included",
        delivery: "included",
        matches: "yes",
        matchReason:
          "Шартты техникалық сипаттама, өлшем, кезең және жеткізу сәйкес. Г — А тобымен бір көз ретінде есептеледі.",
      });
    }
    for (let i = 0; i < 3; i++) {
      const initial =
          i === 2
            ? 0
            : Math.round(
                s.price * (s.values.planned || 1) * (i === 0 ? 1 : 0.65),
              ),
        annual = i === 2 ? 0 : 10000,
        line = `Бастапқы шығын = ${initial}; жылдық = ${annual}; аяқтау = 0`;
      const option = doc(
        `${s.id}-option-${i}`,
        `${s.id}-option-${i}.txt`,
        `DEMO\n${line}`,
      );
      c.options.push({
        id: `option-${i}`,
        label: [
          "Жаңа сатып алу",
          "Бар ресурсты пайдалану / қайта бөлу",
          "Ештеңе істемеу",
        ][i],
        kind: (["buy", "reuse", "doNothing"] as const)[i],
        outcome: i === 2 ? "Қызмет қажетті көлемде көрсетілмейді" : c.outcome,
        meetsNeed: i === 2 ? "no" : "yes",
        evidence: cite(option, initial, line),
        initial,
        annual,
        endCost: 0,
        horizon: 3,
      });
    }
    cases.push(c);
  }
  const missing = cases.filter(
    (c) => !current.data.cases.some((old) => old.id === c.id),
  );
  if (missing.length)
    saveAudit(
      "demo",
      { cases: [...current.data.cases, ...missing] },
      current.version,
    );
  return { cases: loadAudit("demo"), documents: listDocuments("demo") };
}
