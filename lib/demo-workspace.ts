import {
  emptyEvidence,
  emptyFinance,
  emptyWorkflow,
  type Dataset,
  type Request,
  type Stage,
} from "./model";
import { stageLabels } from "./workflow";
export function extendDemo(d: Dataset): Dataset {
  const stamp = new Date().toISOString();
  const date = stamp.slice(0, 10);
  d.requests[0].workflow = {
    ...d.requests[0].workflow,
    department: "DEMO · IT бөлімі",
    ownerRole: "DEMO сатып алу маманы",
    dueDate: date,
  };
  const cases: [
    string,
    string,
    string,
    number,
    number,
    number | null,
    number,
    Stage,
  ][] = [
    [
      "DEMO-002",
      "Шартты білім орталығы",
      "Принтер",
      6,
      180000,
      6,
      0,
      "approved",
    ],
    ["DEMO-003", "Шартты кітапхана", "Орындық", 40, 35000, 40, 15, "returned"],
    ["DEMO-004", "Шартты зертхана", "Микроскоп", 10, 420000, null, 2, "review"],
    [
      "DEMO-005",
      "Шартты оқыту орталығы",
      "Ноутбук",
      12,
      320000,
      12,
      0,
      "review",
    ],
    [
      "DEMO-006",
      "Шартты әкімшілік орталығы",
      "Бағдарламалық лицензия",
      100,
      45000,
      100,
      20,
      "returned",
    ],
    [
      "DEMO-007",
      "Шартты мәдениет үйі",
      "Жұмыс үстелі",
      30,
      85000,
      30,
      0,
      "submitted",
    ],
    [
      "DEMO-008",
      "Шартты медициналық орталық",
      "Резервтік монитор",
      4,
      650000,
      4,
      0,
      "approved",
    ],
    [
      "DEMO-009",
      "Шартты әлеуметтік қызмет",
      "Проектор",
      5,
      280000,
      0,
      5,
      "rejected",
    ],
    [
      "DEMO-010",
      "Шартты спорт мектебі",
      "Жаттығу жабдығы",
      8,
      190000,
      8,
      0,
      "draft",
    ],
  ];
  for (const [
    id,
    organization,
    title,
    quantity,
    price,
    required,
    free,
    stage,
  ] of cases) {
    const evidence = {
      ...emptyEvidence(true),
      source: "Шартты дерек · QARJY CONTROL оқу жиыны",
      document: `DEMO: ${id} қажеттілік тізімі және түгендеу парағы`,
      date,
      verified: true,
    };
    const createDate = new Date(
      Date.now() - (12 - Number(id.slice(-3))) * 86400000,
    ).toISOString();
    const w = emptyWorkflow();
    w.department =
      title === "Бағдарламалық лицензия"
        ? "IT бөлімі"
        : title === "Резервтік монитор"
          ? "Медициналық қызмет"
          : "Әкімшілік-шаруашылық бөлім";
    w.ownerRole = "Шартты сатып алу маманы";
    w.priority = id === "DEMO-008" ? "urgent" : "normal";
    w.dueDate = date;
    const path: Stage[] =
      stage === "draft"
        ? []
        : stage === "submitted"
          ? ["submitted"]
          : stage === "review"
            ? ["submitted", "review"]
            : ["submitted", "review", stage];
    let from: Stage = "draft";
    w.events = path.map((to, i) => {
      const event = {
        id: `${id}-FLOW-${i + 1}`,
        from,
        to,
        role: i === 0 ? "DEMO бөлім маманы" : "DEMO ішкі бақылаушы",
        note: `Шартты оқу оқиғасы: ${stageLabels[to]}. Бұл нақты мемлекеттік келісім емес.`,
        acknowledged: to === "approved",
        at: new Date(Date.parse(createDate) + (i + 1) * 3600000).toISOString(),
      };
      from = to;
      return event;
    });
    w.stage = stage;
    const full = quantity * price,
      partial = Math.max(0, (required ?? quantity) - free) * price;
    const alternatives: Request["alternatives"] = [
      {
        id: `${id}-A`,
        name: "DEMO · Толық жаңа сатып алу",
        kind: "A",
        initial: full,
        installation: 0,
        repair: 0,
        annualMaintenance: full * 0.02,
        annualOperation: 0,
        replacement: 0,
        other: 0,
        lifetime: 3,
        compliant: true,
        evidence,
      },
      {
        id: `${id}-B`,
        name: free
          ? "DEMO · Бос активтер және ішінара сатып алу"
          : "DEMO · Үш жылдық жалға алу",
        kind: free ? "B" : "D",
        initial: free ? partial : 0,
        installation: 0,
        repair: 0,
        annualMaintenance: free ? partial * 0.02 : 0,
        annualOperation: free ? 0 : full * 0.45,
        replacement: 0,
        other: 0,
        lifetime: 3,
        compliant: true,
        evidence,
      },
    ];
    const r: Request = {
      id,
      organization,
      title,
      category: title,
      plannedQuantity: quantity,
      unit: title === "Бағдарламалық лицензия" ? "лицензия" : "дана",
      unitPrice: price,
      requiredOutcome: `DEMO: ${required ?? "белгісіз"} қосымша орынның қызметін қамтамасыз ету`,
      requiredQuantity: required,
      horizon: 3,
      evidence,
      justification:
        "DEMO оқу негіздемесі: қызметтік нәтиже, түгендеу және балама шығындар шартты түрде енгізілген.",
      inventoryConfirmed: true,
      assets: [
        {
          id: `id:${id}-ASSET`,
          category: title,
          total: free + 3,
          inUse: 0,
          free,
          repairable: 2,
          unusable: 1,
          suitable: true,
          available: true,
          inspectedAt: date,
          inspector: "DEMO түгендеу маманы",
          evidence,
        },
      ],
      alternatives,
      finance: {
        ...emptyFinance(),
        evidence,
        baselineId: `${id}-A`,
        selectedId: free ? `${id}-B` : `${id}-A`,
      },
      createdAt: createDate,
      updatedAt: stamp,
      workflow: w,
    };
    if (id === "DEMO-004") {
      r.evidence = { ...evidence, verified: false };
      r.inventoryConfirmed = false;
    }
    if (id === "DEMO-005")
      r.alternatives.push({
        ...alternatives[1],
        id: `${id}-E`,
        name: "DEMO · Арзан, бірақ талапқа сәйкес емес нұсқа",
        kind: "E",
        initial: 300000,
        annualOperation: 0,
        compliant: false,
      });
    if (id === "DEMO-007") r.justification = "";
    if (id === "DEMO-010") {
      r.inventoryConfirmed = false;
      r.assets[0].available = null;
    }
    d.requests.push(r);
    if (stage === "approved" || stage === "rejected")
      d.decisions.push({
        id: `${id}-DECISION`,
        requestId: id,
        issue: "DEMO оқу сценарийіндегі қажеттілік пен дәлелдерді қарау",
        evidence: r.justification,
        proposal:
          stage === "approved"
            ? "DEMO: қажеттілікті құжаттық растау негізінде ішкі келісім тіркелді"
            : "DEMO: бос активтерге байланысты өтінім қайта жоспарлансын",
        role: "DEMO ішкі бақылаушы",
        date,
        status: stage === "approved" ? "accepted" : "rejected",
        reason:
          "Шартты оқу шешімі. Бұл заңды сатып алу рұқсаты немесе нақты қаржылық нәтиже емес.",
        createdAt: stamp,
      });
  }
  // Synthetic lots remain visibly separate from official procurement records.
  d.trials = d.requests.map((r, i) => ({
    id: `DEMO-TRIAL-${i + 1}`,
    type: "lot",
    officialId: `DEMO-LOT-${String(i + 1).padStart(3, "0")}`,
    title: `Шартты лот · ${r.title}`,
    url: `https://example.org/qarjy-control/demo/${i + 1}`,
    date,
    plannedQuantity: r.plannedQuantity,
    unitPrice: r.unitPrice,
    requestId: r.id,
    notes:
      "Ойдан жасалған DEMO жазба. Ресми сатып алу лоты емес; университеттің нақты 10 лот талабына кірмейді.",
  }));
  d.settings = {
    lectureTool: "",
    owner: "DEMO · Ішкі бақылау маманы",
    frequency: "Шартты жоспар: әр өтінім түскенде және ай сайын",
    rollout:
      "DEMO енгізу жоспары: 1) бөлімдерден қажеттілік жинау; 2) түгендеуді растау; 3) баламаларды салыстыру; 4) сарапшы қарауы; 5) ішкі келісім және ай сайын KRI мониторингі. Нақты ұйым бекіткен жоспар емес.",
  };
  d.iterations = [
    {
      id: "DEMO-ITERATION-REAL-1",
      prompt:
        "Нақты диалогтан оқу көшірмесі: «менде сұрақ, бұл жай бар ақпаратты бірінен екіншісіне қою болып қалмады ма?»",
      decision:
        "Ашық лот деректерінің қажеттілік пен активтерді толық тексеруге жеткіліксіз екені түсіндірілді.",
      checks:
        "Пайдаланушы енгізген бір лот пен DEMO есебінің шектеулері талқыланды.",
      changes:
        "Жобаның есептеу мүмкіндігі мен нақты нәтиженің дәлелдену шекарасы ажыратылды.",
      createdAt: stamp,
    },
    {
      id: "DEMO-ITERATION-REAL-2",
      prompt: "Нақты диалогтан оқу көшірмесі: «оны тауып көр онда»",
      decision:
        "Ресми аудит құжатынан нақты жүктеме көрсеткіштерін іздеу жүргізілді.",
      checks:
        "69 бет OCR арқылы оқылды; маңызды сандар 12, 25, 33-беттердің суретімен салыстырылды; 914/5080 = 17,99% қайта есептелді.",
      changes:
        "Шиелі дереккөзі тіркелді; кейінгі жалғастыруда бөлек жүктеме модулі әзірленді. Төмен жүктеме нақты үнем деп көрсетілмеді.",
      createdAt: stamp,
    },
    {
      id: "DEMO-ITERATION-REAL-3",
      prompt:
        "Нақты диалогтан оқу көшірмесі: «енді біздің сайтты жетілдір, әлі де толық емес сосын жұмыс жасап тұрғандай ішіне деректер енгізілсін ойдан»",
      decision:
        "Өтінімдерді қарау кезеңдері және анық таңбаланған кеңейтілген DEMO жиыны әзірленді.",
      checks:
        "Қолданыстағы модель мен есептеу ережелері оқылды; бұрынғы нұсқаның 34 тесті мен 3 браузерлік сценарийінің нәтижелері бар. Жаңа кезеңдердің қабылдау шарттары жеке тексеріледі.",
      changes:
        "Бөлім, жауапты рөл, кезең тарихы және шартты жұмыс кезегі қосылды. Бұл жазбалар нақты диалогтан алынған, оқу үшін DEMO-ға көшірілген.",
      createdAt: stamp,
    },
  ];
  const base = d.workloads[1];
  d.workloads.push(
    {
      ...structuredClone(base),
      id: "DEMO-WORKLOAD-NORMAL",
      asset: "DEMO · Қалыпты жүктеме",
      capacity: 1000,
      actual: 780,
      reasons: {
        reserve: "no",
        staff: "no",
        downtime: "no",
        referrals: "no",
        geography: "no",
      },
      expertConclusion:
        "Шартты мысал: 78% жүктеме. Қарау шегінен жоғары болуы тиімділікке кепіл емес.",
    },
    {
      ...structuredClone(base),
      id: "DEMO-WORKLOAD-OVER",
      asset: "DEMO · Қуаттан жоғары жүктеме",
      capacity: 1000,
      actual: 1160,
      expertConclusion:
        "Шартты мысал: 116%. Есептік қуат пен кезең анықтамасын қайта тексеру қажет.",
    },
  );
  return d;
}
