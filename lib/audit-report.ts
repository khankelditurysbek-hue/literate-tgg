import { officialProgram, compareProgramSources } from "./official-program";
import { type AuditCase, type SourceDocument } from "./audit-model";
import {
  assessBusinessCase,
  auditKri,
  inputLabels,
  profiles,
} from "./audit-engine";
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const n = (v: number | null) =>
  v === null
    ? "Белгісіз"
    : v.toLocaleString("kk-KZ", { maximumFractionDigits: 2 });
const sources = `<p>Дәріс: «Мемлекеттік сатып алудағы сыбайлас жемқорлық және алаяқтық тәуекелдері», пайдаланушы берген 15 беттік PDF, оқылған күні 2026-11-02. 2-бет — кезеңдер; 8-бет — бес сұрақтық бизнес-кейс; 9-бет — нарық медианасы; 13-бет — тәуекелді басқару.</p><p>1. OECD (2015), <i>Recommendation of the Council on Public Procurement</i>, OECD/LEGAL/0411. Бағалау, тәуекелді басқару, есептілік және бюджетпен интеграция. Ресми мекенжай: <a href="https://legalinstruments.oecd.org/en/instruments/OECD-LEGAL-0411">legalinstruments.oecd.org/en/instruments/OECD-LEGAL-0411</a>.</p><p>2. U.S. GAO (2015), <i>A Framework for Managing Fraud Risks in Federal Programs</i>, GAO-15-593SP. Тәуекелді бағалау, алдын алушы бақылау және мониторинг. Ресми мекенжай: <a href="https://www.gao.gov/products/gao-15-593sp">gao.gov/products/gao-15-593sp</a>.</p><p><strong>Тексеру күйі:</strong> осы екі еңбек дәрістің библиографиялық сілтемелеріне сүйеніп берілді. Халықаралық түпнұсқалар бұл ортада толық оқылып тексерілді деген тұжырым жасалмайды. Дәл осы жергілікті формулаларды немесе 25% шегін халықаралық ұйым бекітті деуге болмайды. Тапсыру алдында түпнұсқалардың тиісті бөлімдерімен тексеру қажет.</p>`;
export function auditReportHtml(
  cases: AuditCase[],
  docs: SourceDocument[],
  mode: "real" | "demo",
  summary = false,
) {
  const kri = auditKri(cases, docs),
    at = new Date().toISOString().slice(0, 10),
    sample = summary ? cases.slice(0, 6) : cases;
  const table = `<table><thead><tr><th>Тексеру</th><th>Жоспар</th><th>Қажеттілік</th><th>Артық көлем</th><th>Нәтиже</th></tr></thead><tbody>${
    sample
      .map((c) => {
        const r = assessBusinessCase(c, docs);
        return `<tr><td>${esc(c.title)}</td><td>${n(c.inputs.planned.value)} ${esc(c.unit)}</td><td>${n(r.quantity.need)} ${esc(c.unit)}</td><td>${n(r.quantity.excess)} ${esc(c.unit)}</td><td>${r.label}</td></tr>`;
      })
      .join("") || '<tr><td colspan="5">Сынақ дерегі енгізілмеген</td></tr>'
  }</tbody></table>`;
  const sections = [
    `<section><span class="eyebrow">1 / 5 · ПРОБЛЕМА ЖӘНЕ ШЕКАРА</span><h1>QARJY CONTROL<br>Қажеттілікті дәлелмен тексеру</h1><p class="lead">Бір кезең: бюджеттік өтінім, қажеттілікті негіздеу. Бір тәуекел: нақты қажеттіліктен артық көлемге қаражат жоспарлау.</p><p><strong>Себеп → оқиға → салдар:</strong> қолдағы ресурс пен қызмет қажеттілігі жеткіліксіз тексеріледі → негізделген көлемнен артық сатып алу сұралады → бюджетке артық жүктеме және пайдаланылмайтын активтер қаупі туады.</p><p>Құрал жоспардағы санды бастапқы файлдардағы қызмет көлемімен және қолжетімді ресурспен салыстырады. Қызметтік нәтиже, резерв, кезең және өлшем бірлігі санның мағынасын анықтайды. Санды тану мен оның шынайылығын тексеру бөлек міндеттер.</p><h2>Не қабылданады, не шығарылады?</h2><p>Кіріс: PDF, фото/скан PNG/JPEG, TXT/CSV, XLSX; дереккөзі мен күні; файлдағы нақты санға бет пен үзінді; бірдей сипаттамалы нарық ұсыныстары. Шығыс: есептік қажеттілік, артық көлем белгісі немесе дерек жеткіліксіздігі, формула, нарық медианасы және жетіспейтін дәлелдер.</p><p>Әр файлдың SHA-256 хэші түпнұсқаны кейін сол байттармен салыстыруға мүмкіндік береді. Хэш электрондық қолтаңба да, құжат мазмұнының шынайылығын растау да емес.</p><h2>Нақты қолдану</h2><p>Пайдаланушы жергілікті компьютерде START-WINDOWS.cmd ашады. Браузерден жаңа тексеру қосып, санатын таңдайды, құжат жүктейді, бетін танытады және сандарын байланыстырады. Есеп осы өзгерістерге сәйкес қайта есептеледі. Жүйе сатып алуға келісім бермейді және құқықтық өкілеттіктерді алмастырмайды.</p></section>`,
    `<section><span class="eyebrow">2 / 5 · ҚҰРАЛ ЖӘНЕ НЕГІЗ</span><h2>Дәрістегі 1-құрал: бес сұрақтық бизнес-кейс</h2><p>Стратегия — мәселенің дәлелі; экономика — кемінде үш нұсқа, соның ішінде ештеңе істемеу; нарық — сәйкес ұсыныстар; қаржы — бір мерзімдегі толық шығын; басқару — кім, қашан, қандай қызмет нәтижесін қайта тексереді.</p>${sources}<h2>Санаттық есеп ережелері</h2><table><tbody>${Object.values(
      profiles,
    )
      .map((p) => `<tr><td>${p.name}</td><td>${p.formula}</td></tr>`)
      .join(
        "",
      )}</tbody></table><p>Шығын материалында дана/қаптамаға ғана жоғары қарай бүтін дөңгелектеу қолданылады; кг/литр/метр үшін бөлшек көлем режимі таңдалады.</p><p>Нарық эталоны — кемінде 3 бөлек тәуелсіздік тобындағы салыстырмалы бағаның медианасы. Ауытқу = (жоспарланған бірлік баға − медиана) / медиана × 100%. Бастапқы 25% — дәрістің 9-бетіндегі оқу шегі; заңдық норматив емес. Топтар талдаушының дерегімен белгіленеді, компания байланыстары автоматты тексерілмейді.</p></section>`,
    `<section><span class="eyebrow">3 / 5 · СЫНАҚ НӘТИЖЕСІ</span><h2>${mode === "demo" ? "DEMO: алгоритмді тексеру" : "Енгізілген нақты деректер"}</h2><p>Есеп күні: ${at}. Режим: <strong>${mode === "demo" ? "Шартты дерек — далалық сынақ емес" : "Нақты дерек режимі — түпнұсқалығы пайдаланушымен тексеріледі"}</strong>. Барлығы ${cases.length} тексеру, көлем есебі бар ${kri.complete}, жеткіліксіз ${kri.incomplete}. Құжат саны ${docs.length}.</p>${table}<p>Көрсетілгені ${sample.length} / ${cases.length}. Барлық жол толық HTML және CSV нәтижелерінде беріледі.</p><p>Негізгі KRI: ${kri.flagged} / ${kri.complete} = ${kri.percent === null ? "есептелмейді" : n(kri.percent) + "%"}. Бұл тәуекел ықтималдығы, дәлелденген құқықбұзушылық немесе үнем пайызы емес.</p><h2>Бір нақты бюджеттік бағдарламада сынау</h2><p>010 «${esc(officialProgram.title)}», бағдарлама ID ${officialProgram.id}. Дерек алынған күні ${officialProgram.retrievedAt}. Портал кестесі мен ресми XLS файлының 12 ортақ ұяшығы салыстырылды: ${compareProgramSources().mismatches} ұяшықта сан бір жылға сәйкес емес; жыл бағандары портал кестесінде 2023–2027, XLS-те 2022–2026. Мысал: 2026 жылғы сома портал бойынша 148 757 мың ₸, XLS бойынша 149 560 мың ₸.</p><p><strong>Нәтиже:</strong> жыл мен нұсқаны нақтыламай көлемді не бағаны негіздеуге қабылданбайды. Бұл артық шығын немесе заңбұзушылық анықталды деген сөз емес. <a href="${officialProgram.url}">Ресми бағдарлама</a>; <a href="${officialProgram.fileUrl}">XLS түпнұсқасы</a>; парақтар «010 каз» / «010 рус», C31:G34, C43:G45.</p><h2>Сынақтың шегі</h2><p>${mode === "demo" ? "Жоғарыдағы DEMO жолдары — алгоритм тесті. Одан бөлек келтірілген 010 бағдарламасының деректері нақты; оның сынағы дерек сапасының тосқауылын тексерді, негізгі артық көлем тәуекелін толық валидациялаған жоқ." : "Нақты режимде сақтау сынақтың автоматты дәлелі емес. Қандай ресми 10 лотқа не бір бағдарламаға / хаттамаға жататыны, сілтемелері мен алынған күні қосымша тексерілуі керек."}</p><p>Бұрын зерттелген Шиелі ауруханасының ресми аудиті жүктеме контекстін көрсетті, бірақ жаңа сатып алудың дәлелденген көлемін, бос актив санын немесе үнемді анықтаған жоқ. Ол осы талаптың орнына көрсетілмейді. Сатып алу порталының осы ортадағы HTTP 503 қатесі дерек жоқтығын дәлелдемейді; деректі сайттан экспорттап енгізуге болады.</p><h2>Дәлелді тексеру тәртібі</h2><p>Әр санның құжаты, беті, үзіндісі және өлшем-кезең түсіндірмесі қажет. Үзінді танылған мәтінде болуы және таңдалған сан кіріс мәнімен сәйкес келуі тиіс. Қате не құжатсыз мән есепті «дерек жеткіліксіз» күйінде қалдырады.</p></section>`,
    `<section><span class="eyebrow">4 / 5 · СЫНИ ТЕКСЕРУ ЖӘНЕ ЖИ</span><h2>Қай жерде қателестік?</h2><p>ЖИ алғашқы редакцияда әртүрлі сатып алу түріне бір логиканы қолданды, файлсыз «тексерілді» белгісіне және ішкі келісім кезеңдеріне арқа сүйеді. Бұл нақты тексеру мен әкімшілік тіркеуді шатастырды. Пайдаланушы осыны қабылдамай, бастапқы тапсырмаға қайта бағыттады. Түзету: түріне сәйкес формула, бастапқы файл, үзіндімен байланыс, салыстырудан шығарылған ұсыныстардың ашық себебі.</p><h2>Жалған дабыл және өткізіп алу</h2><p>Резервтегі медициналық жабдықтың аз қолданылуы оны қажетсіз етпейді. DEMO-да құжатпен негізделген резерв көлемі бар бақылау мысалы сақталған. Қызмет нормасы асыра көрсетілсе немесе бір көз бірнеше тәуелсіз көз ретінде белгіленсе, дұрыс арифметика қате қорытынды беруі мүмкін. Байланысты компанияларды, жалған актілерді және шынайы сапаны бұл құрал өздігінен тексермейді.</p><p>OCR-де 1 мен 7, 0 мен О, үтір мен нүкте шатасуы мүмкін. Тану сенімділігінің пайызы деректің шынайылық ықтималдығы емес. Түпнұсқаны жанында ашып салыстыру керек. Құжаттардағы нұсқаулар талдаудың кіріс мәтіні ретінде ғана қаралады.</p><h2>Нақты ЖИ айналымдары</h2><ol><li>Бастапқы тапсырма: қажеттілікті тексеретін жұмыс істейтін цифрлық құрал. ЖИ алғашқы есеп пен сақтау жүйесін ұсынды.</li><li>Пайдаланушы: «келісім қалай беріледі ... толықтығын қалай растайды». Рөлді мәтінмен жазу тәуелсіз растау емес екені анықталды.</li><li>Пайдаланушы: «түріне қарай тексеруде әртүрлі болады ... қайтадан қарап шық, толықтыр». Негізгі өнім дәлел мен санаттық ережеге қайта құрылды.</li><li>Пайдаланушы дәрісті берді. 8-беттегі нақты құрал таңдалды, жалпылама халықаралық сілтемелердің орны мен тексеру күйі ашылды.</li></ol><p>Соңғы түзетуді пайдаланушы қабылдады деп алдын ала жазылмайды. ЖИ әзірлеуге көмектесті; таңдау, шектерді тексеру және жұмысты қорғау автордың міндеті болып қалады.</p></section>`,
    `<section><span class="eyebrow">5 / 5 · ЕНГІЗУ ЖӘНЕ БАҚЫЛАУ</span><h2>Кім және қашан қолданады?</h2><table><tbody><tr><td>Иесі</td><td>Жоспарлау / экономикалық талдау бөлімі; әр файлдың дереккөзін көрсетеді.</td></tr><tr><td>Жиілігі</td><td>Әр бюджеттік өтінім берілер алдында және жоспар көлемі өзгерген сайын.</td></tr><tr><td>Дерек</td><td>Қызмет көлемі, түгендеу/қалдық, резерв негізі, өлшеу ведомосы, бірдей сипаттамалы нарық ұсыныстары.</td></tr><tr><td>Екінші тексеру</td><td>Өзге бөлім маманы түпнұсқа, кезең, өлшем, норма және көздердің байланысын қарайды. Бағдарлама рөлдің өкілеттігін тексермейді.</td></tr><tr><td>Нәтиже</td><td>Қай көлемнің қандай дәлелмен есептелгені, артық көлем белгісі және қайта тексерілетін сұрақтар.</td></tr></tbody></table><h2>Өз KRI-і</h2><p><strong>KRI = артық көлем белгісі бар құжатқа байланған есептер / барлық құжатқа байланған көлем есептері × 100%.</strong> Қамту көрсеткіші: есептелген / барлық тексерулер. Дерек жеткіліксіз болғандар бөлгіштен түседі, бірақ бөлек саны міндетті түрде көрсетіледі. Төмен KRI-ді жақсы нәтиже деп автоматты қабылдамау керек.</p><h2>Алғашқы енгізу</h2><p>Бір бөлімдегі бір сатып алу санатынан бастаңыз; оның нормасы мен қуат анықтамасын маманмен келісіңіз. Өткен өтінімдерде жалған дабыл мен өткізіп алуды тіркеңіз. Содан кейін ағымдағы өтінімдерге қолданыңыз. Заңды рәсім мен шешім қабылдау тәртібі өзгермейді.</p><h2>Қауіпсіз қолдану шекарасы</h2><p>Жергілікті нұсқа 127.0.0.1 адресінде іске қосылады. ЖСН, телефон, жеке мекенжайлар қолданылмайды; файлды жүктемей тұрып артық жеке деректі алып тастау керек. Сыртқы ЖИ сервисі шақырылмайды. Авторизация мен сервер әкімшісінен қорғалған аудит жоқ; осы нұсқаны көпшілікке ашық серверге орналастыруға дайын деп санауға болмайды.</p><p>Құралға нақты үнемді дәлелдеу міндеті қойылмайды. Үнем тек бөлек бастапқы міндеттеме, өзгеріс, төлем және қызмет нәтижесінің сақталуы құжаттарымен расталады.</p></section>`,
  ];
  const appendix = summary
    ? ""
    : `<section><span class="eyebrow">ҚОСЫМША · ӘР ЕСЕПТІҢ ДӘЛЕЛ ІЗІ</span>${cases
        .map((c) => {
          const r = assessBusinessCase(c, docs);
          return `<article><h2>${esc(c.title)}</h2><p>${esc(c.outcome)} · ${esc(c.periodStart)} — ${esc(c.periodEnd)}</p><p>${profiles[c.profile].name}</p><code>${esc(r.quantity.formula)}</code><table><tr><th>Көрсеткіш</th><th>Сан</th><th>Дәлел</th></tr>${profiles[
            c.profile
          ].keys
            .map((k) => {
              const v = c.inputs[k],
                d = docs.find((x) => x.id === v.documentId);
              return `<tr><td>${inputLabels[k]}</td><td>${n(v.value)}</td><td>${esc(d?.name || "Тіркелмеген")}, ${v.page}-бет. ${esc(v.quote)}<br>Мағынасы: ${esc(v.context)}</td></tr>`;
            })
            .join(
              "",
            )}</table><p>${r.label}. Қажеттілік ${n(r.quantity.need)} ${esc(c.unit)}; артық көлем ${n(r.quantity.excess)} ${esc(c.unit)}.</p>${r.quantity.missing.length ? `<ul>${r.quantity.missing.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}<h3>Нарық ұсыныстары</h3><table><tr><th>Көз</th><th>Баға</th><th>Қосу / алып тастау</th></tr>${r.market.quotes.map((q) => `<tr><td>${esc(q.alias)}</td><td>${n(q.price.value)} ₸</td><td>${q.included ? "Медианаға кірді" : esc(q.reasons.join("; "))}</td></tr>`).join("")}</table><p>Медиана ${n(r.market.reference)} ₸; ауытқу ${n(r.market.deviation)}%. Талдау күні ${r.market.asOf}. ${esc(c.marketNote)}</p><h3>Баламалар және толық құн</h3><table><tr><th>Нұсқа</th><th>Нәтиже</th><th>Бір мерзімдегі құн</th></tr>${r.options.map((o) => `<tr><td>${esc(o.label)}</td><td>${esc(o.outcome)}</td><td>${n(o.total)} ₸ / ${o.horizon} жыл. ${esc(o.issues.join("; "))}</td></tr>`).join("")}</table><p>Сыни баға: ${esc(c.expertNote || "Енгізілмеген")}</p><p>Нәтижені кейін тексеру: ${esc(c.ownerRole)}, ${esc(c.reviewDate)}; ${esc(c.outcomeMetric)}</p></article>`;
        })
        .join(
          "",
        )}<h2>Түпнұсқалар тізілімі</h2><table><tr><th>Файл / дереккөз</th><th>Күн</th><th>SHA-256</th></tr>${docs.map((d) => `<tr><td>${esc(d.name)}<br>${esc(d.source)}<br>${esc(d.url)}</td><td>${esc(d.date)}</td><td class="hash">${esc(d.sha256)}</td></tr>`).join("")}</table></section>`;
  return `<!doctype html><html lang="kk"><meta charset="utf-8"><title>QARJY CONTROL · ${summary ? "түсініктеме" : "дәлелді есеп"}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#e9eef1;color:#1a3547;font:13px/1.55 Arial,Helvetica,sans-serif}section{background:white;max-width:210mm;margin:18px auto;padding:18mm;min-height:260mm;break-after:page}section:last-child{break-after:auto}h1{font-size:30px;line-height:1.25;margin:20px 0}h2{font-size:18px;margin:22px 0 12px}h3{font-size:14px}p{margin:0 0 13px}.lead{font-size:16px;color:#3b6a77}.eyebrow{font-size:10px;letter-spacing:1px;color:#55828b}table{border-collapse:collapse;width:100%;font-size:10px;margin:15px 0}th,td{text-align:left;vertical-align:top;border:1px solid #d8e2e8;padding:7px}th{background:#f0f5f7}.hash{font-size:8px;overflow-wrap:anywhere;word-break:break-all}code{display:block;white-space:normal;background:#f0f5f7;padding:12px;font-size:11px}li{margin-bottom:7px}article{break-inside:auto;border-bottom:1px solid #c5d7df;padding-bottom:20px;margin-bottom:20px}a{color:#236a7b;overflow-wrap:anywhere}@media print{body{background:white;font-size:11px;line-height:1.5}section{padding:0;margin:0;min-height:0}h1{font-size:28px}h2{font-size:16px;margin:17px 0 10px}p{margin-bottom:11px}table{font-size:9px}th,td{padding:5px}tr{break-inside:avoid}}</style>${sections.join("")}${appendix}</html>`;
}
export function auditResultsCsv(cases: AuditCase[], docs: SourceDocument[]) {
  const rows = [
    [
      "id",
      "title",
      "profile",
      "period_start",
      "period_end",
      "unit",
      "planned",
      "document_linked_need",
      "excess",
      "status",
      "reference_median_kzt",
      "price_deviation_pct",
      "missing",
      "expert_note",
    ],
    ...cases.map((c) => {
      const r = assessBusinessCase(c, docs);
      return [
        c.id,
        c.title,
        c.profile,
        c.periodStart,
        c.periodEnd,
        c.unit,
        c.inputs.planned.value,
        r.quantity.need,
        r.quantity.excess,
        r.label,
        r.market.reference,
        r.market.deviation,
        r.quantity.missing.join("; "),
        c.expertNote,
      ];
    }),
  ];
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v ?? "")
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n")
  );
}
