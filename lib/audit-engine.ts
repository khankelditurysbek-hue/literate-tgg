import type {
  AuditCase,
  Citation,
  InputKey,
  SourceDocument,
} from "./audit-model";
export const profiles = {
  equipment: {
    name: "Жабдық / ұзақ қолданылатын актив",
    description:
      "Бірдей қызмет пен кезең: қажетті қуаттан қолда бар жарамды, қолжетімді қуат шегеріледі. Резерв жеке дәлелденеді.",
    keys: [
      "planned",
      "demand",
      "capacity",
      "existing",
      "reserve",
    ] as InputKey[],
    formula:
      "max(0, ceil(қызмет көлемі / бір жабдық қуаты) + резерв − қолжетімді жабдық)",
  },
  consumables: {
    name: "Шығын материалы",
    description:
      "Алушылар саны × бір алушыға шығын × кезең. Қалдық пен расталған жеткізілім қайта сатып алынбайды.",
    keys: [
      "planned",
      "demand",
      "rate",
      "periods",
      "stock",
      "incoming",
      "reserve",
    ] as InputKey[],
    formula:
      "max(0, ceil(алушылар × шығын нормасы × кезең + резерв − қалдық − расталған жеткізілім))",
  },
  service: {
    name: "Қызмет / лицензия пакеті",
    description:
      "Бір кезеңдегі жұмыс көлемі ішкі қуатпен және пакет көлемімен салыстырылады. Адам санын қызмет сағатымен араластырмаңыз.",
    keys: [
      "planned",
      "demand",
      "capacity",
      "existing",
      "reserve",
    ] as InputKey[],
    formula:
      "max(0, ceil(max(0, жұмыс көлемі − ішкі қуат) / бір пакет көлемі) + резерв)",
  },
  works: {
    name: "Құрылыс / жөндеу жұмысы",
    description:
      "Бір сметалық жолдың физикалық көлемі өлшеу ведомосымен салыстырылады. Бағдарлама инженерлік сараптаманы және сметаның дұрыстығын растамайды.",
    keys: ["planned", "estimate"] as InputKey[],
    formula: "өлшеу / ақау ведомосындағы негізделген көлем (бір сметалық жол)",
  },
};
export const inputLabels: Record<InputKey, string> = {
  planned: "Жоспарланған көлем",
  demand: "Қызмет көлемі / алушылар",
  capacity: "Бір жабдықтың / пакеттің қуаты",
  existing: "Қолда бар сәйкес жабдық / ішкі қуат",
  reserve: "Құжатпен негізделген резерв",
  rate: "Бір алушыға шығын нормасы",
  periods: "Кезең саны",
  stock: "Қолданыстағы жарамды қалдық",
  incoming: "Бұрын расталған жеткізілім",
  estimate: "Өлшеу ведомосындағы көлем",
};
export function normalize(s: string) {
  return s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}
export function parseSourceNumber(s: string): number | null {
  const cleaned = s.replace(/[\s\u00a0\u202f₸]/g, "").replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
export function citationIssues(
  c: Citation,
  docs: SourceDocument[],
  mode: "real" | "demo",
): string[] {
  if (c.value === null) return ["Сан белгісіз"];
  if (!Number.isFinite(c.value) || c.value < 0 || c.value > 1e10)
    return ["Сан есеп шегіне сәйкес емес"];
  const doc = docs.find((d) => d.id === c.documentId && d.mode === mode);
  if (!doc) return ["Түпнұсқа файл тіркелмеген"];
  const reasons: string[] = [];
  if (mode === "real" && doc.origin === "demo")
    reasons.push("DEMO дерек нақты тексеруге жарамайды");
  const page = doc.pages.find((p) => p.page === c.page);
  if (
    !page ||
    !c.quote.trim() ||
    !normalize(page.text).includes(normalize(c.quote))
  )
    reasons.push("Үзінді танылған бет мәтінімен сәйкес емес");
  if (
    !c.raw.trim() ||
    ![
      ...c.quote.matchAll(
        /(?<![\d.,])\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?(?![\d.,])/g,
      ),
    ].some((m) => normalize(m[0]) === normalize(c.raw)) ||
    parseSourceNumber(c.raw) !== c.value
  )
    reasons.push("Сан құжат үзіндісіндегі таңдалған санға сәйкес емес");
  if (!c.context.trim())
    reasons.push("Өлшем, кезең және осы жолға сәйкестік түсіндірілмеген");
  return reasons;
}
export function assessQuantity(c: AuditCase, docs: SourceDocument[]) {
  const p = profiles[c.profile];
  const missing = p.keys.flatMap((k) =>
    citationIssues(c.inputs[k], docs, c.mode).map(
      (m) => `${inputLabels[k]}: ${m}`,
    ),
  );
  const n = (key: InputKey) => c.inputs[key].value!;
  if (!c.outcome.trim()) missing.push("Қызметтік нәтиже сипатталмаған");
  if (!c.specification.trim())
    missing.push("Салыстырылатын сипаттама / өлшем негізі жоқ");
  if (
    (c.profile === "equipment" || c.profile === "service") &&
    n("capacity") !== null &&
    n("capacity") <= 0
  )
    missing.push("Бір жабдықтың / пакеттің қуаты нөлден жоғары болуы керек");
  if (c.profile === "consumables" && (n("rate") === 0 || n("periods") === 0))
    missing.push("Шығын нормасы мен кезең саны нөлден жоғары болуы керек");
  if (c.profile === "service")
    for (const k of ["planned", "reserve"] as InputKey[])
      if (n(k) !== null && !Number.isInteger(n(k)))
        missing.push(`${inputLabels[k]}: пакет саны бүтін болуы керек`);
  if (c.profile === "equipment")
    for (const k of ["planned", "existing", "reserve"] as InputKey[])
      if (n(k) !== null && !Number.isInteger(n(k)))
        missing.push(`${inputLabels[k]}: жабдық саны бүтін болуы керек`);
  let need: number | null = null;
  if (!missing.length) {
    if (c.profile === "equipment")
      need = Math.max(
        0,
        Math.ceil(n("demand") / n("capacity")) + n("reserve") - n("existing"),
      );
    if (c.profile === "consumables") {
      const required =
        n("demand") * n("rate") * n("periods") +
        n("reserve") -
        n("stock") -
        n("incoming");
      need = Math.max(
        0,
        c.rounding === "continuous"
          ? Math.round(required * 1e6) / 1e6
          : Math.ceil(required),
      );
    }
    if (c.profile === "service")
      need = Math.max(
        0,
        Math.ceil(Math.max(0, n("demand") - n("existing")) / n("capacity")) +
          n("reserve"),
      );
    if (c.profile === "works") need = n("estimate");
    if (need !== null && (!Number.isFinite(need) || need > 1e10)) {
      missing.push("Есептеу көлемі қауіпсіз шектен асты");
      need = null;
    }
  }
  const excess =
    need === null
      ? null
      : Math.max(0, Math.round((n("planned") - need) * 1e6) / 1e6);
  return {
    need,
    excess,
    missing,
    formula:
      c.profile === "consumables" && c.rounding === "continuous"
        ? "max(0, алушылар × норма × кезең + резерв − қалдық − расталған жеткізілім); бүтінге дөңгелектелмейді"
        : p.formula,
    status: need === null ? "insufficient" : excess! > 0 ? "flag" : "clear",
  } as const;
}
export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b),
    m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}
export function assessMarket(
  c: AuditCase,
  docs: SourceDocument[],
  asOf = new Date().toISOString().slice(0, 10),
) {
  const usedGroups = new Set<string>();
  const quotes = c.quotes.map((q) => {
    const reasons = citationIssues(q.price, docs, c.mode);
    if (q.price.value === 0) reasons.push("Нөлдік баға эталонға жарамайды");
    if (
      q.matches !== "yes" ||
      !q.matchReason.trim() ||
      normalize(q.specification) !== normalize(c.specification)
    )
      reasons.push("Сипаттама сәйкестігі негізделмеген");
    if (normalize(q.unit) !== normalize(c.unit))
      reasons.push("Өлшем бірлігі басқа");
    if (c.vat === "unknown" || q.vat !== c.vat)
      reasons.push("ҚҚС негізі салыстырылмайды");
    if (c.delivery === "unknown" || q.delivery !== c.delivery)
      reasons.push("Жеткізу шарттары салыстырылмайды");
    const age = (Date.parse(asOf) - Date.parse(q.date)) / 864e5;
    if (age < 0 || age > c.maxQuoteAge)
      reasons.push("Баға күні салыстыру аралығына кірмейді");
    const group = normalize(q.independenceGroup);
    if (!group) reasons.push("Тәуелсіздік тобы жоқ");
    const document = q.price.documentId;
    const hash = docs.find((d) => d.id === document)?.sha256;
    const sourcePage = docs
      .find((d) => d.id === document)
      ?.pages.find((p) => p.page === q.price.page);
    if (
      !sourcePage ||
      !normalize(sourcePage.text).includes(normalize(q.specification))
    )
      reasons.push("Сипаттама дереккөз бетінде жоқ");
    if (
      usedGroups.has(group) ||
      usedGroups.has(`doc:${document}`) ||
      (hash && usedGroups.has(`hash:${hash}`))
    )
      reasons.push("Бір топ / бір файл қайта саналған");
    if (!reasons.length) {
      usedGroups.add(group);
      usedGroups.add(`doc:${document}`);
      if (hash) usedGroups.add(`hash:${hash}`);
    }
    return { ...q, reasons, included: reasons.length === 0 };
  });
  const valid = quotes.filter((q) => q.included);
  const reference =
    valid.length >= 3 ? median(valid.map((q) => q.price.value!)) : null;
  const priceIssues = citationIssues(c.plannedPrice, docs, c.mode);
  const deviation =
    reference && priceIssues.length === 0
      ? ((c.plannedPrice.value! - reference) / reference) * 100
      : null;
  return {
    quotes,
    reference,
    deviation,
    priceIssues,
    flag: deviation !== null && deviation > c.marketThreshold,
    eligible: valid.length,
    asOf,
  };
}
export function assessBusinessCase(c: AuditCase, docs: SourceDocument[]) {
  const quantity = assessQuantity(c, docs),
    market = assessMarket(c, docs);
  const options = c.options.map((o) => {
    const issues = citationIssues(o.evidence, docs, c.mode);
    if (o.initial !== o.evidence.value)
      issues.push("Бастапқы шығын дереккөздегі мәнмен сәйкес емес");
    const tokens = [
      ...o.evidence.quote.matchAll(/\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?/g),
    ].map((m) => parseSourceNumber(m[0]));
    for (const [label, value] of [
      ["Бастапқы", o.initial],
      ["Жылдық", o.annual],
      ["Кезең соңындағы", o.endCost],
    ] as const) {
      if (value === null) issues.push(`${label} шығын белгісіз`);
      else if (!tokens.includes(value))
        issues.push(`${label} шығын құжат үзіндісінде жоқ`);
    }
    const total = [o.initial, o.annual, o.endCost].every((v) => v !== null)
      ? Math.round((o.initial! + o.annual! * o.horizon + o.endCost!) * 100) /
        100
      : null;
    if (
      total !== null &&
      (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER / 100)
    )
      issues.push("Толық шығын қауіпсіз есеп шегінен асты");
    return { ...o, issues, total: issues.length ? null : total };
  });
  const comparable = options.filter(
    (o) =>
      !o.issues.length &&
      o.total !== null &&
      o.meetsNeed === "yes" &&
      o.outcome.trim(),
  );
  const horizons = new Set(comparable.map((o) => o.horizon));
  const five = [
    {
      name: "Стратегия",
      ready: !!c.strategy.trim() && quantity.need !== null,
      detail: "Қызметтік мәселе, көлем және дәлел",
    },
    {
      name: "Экономика",
      ready:
        options.length >= 3 &&
        options.some((o) => o.kind === "doNothing" && o.outcome.trim()) &&
        comparable.length >= 2 &&
        horizons.size === 1,
      detail:
        "Кемінде 3 нұсқа; ештеңе істемеу салдары; 2 сәйкес нұсқаның бір мерзімдегі құны",
    },
    {
      name: "Нарық",
      ready: market.reference !== null && !!c.marketNote.trim(),
      detail: "Кемінде 3 салыстырмалы дереккөз, тәуелсіздік шектері",
    },
    {
      name: "Қаржы",
      ready:
        comparable.length >= 2 && horizons.size === 1 && !!c.financeNote.trim(),
      detail: "Бір мерзімдегі толық шығын және қаржы көзі",
    },
    {
      name: "Басқару",
      ready: !!c.ownerRole.trim() && !!c.reviewDate && !!c.outcomeMetric.trim(),
      detail: "Жауапты рөл, кейінгі тексеру күні және нәтиже өлшемі",
    },
  ];
  return {
    quantity,
    market,
    options,
    five,
    packageComplete: five.every((q) => q.ready),
    label:
      quantity.status === "insufficient"
        ? "Дерек жеткіліксіз"
        : quantity.status === "flag"
          ? "Артық көлем белгісі"
          : "Көлем бойынша белгі жоқ",
  };
}
export function auditKri(cases: AuditCase[], docs: SourceDocument[]) {
  const results = cases.map((c) => assessQuantity(c, docs)),
    complete = results.filter((r) => r.need !== null),
    flagged = complete.filter((r) => r.status === "flag");
  return {
    total: cases.length,
    complete: complete.length,
    flagged: flagged.length,
    incomplete: cases.length - complete.length,
    percent: complete.length ? (flagged.length / complete.length) * 100 : null,
  };
}
