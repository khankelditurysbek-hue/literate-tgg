import { stageLabels } from "./workflow";
import { utilization } from "./utilization";
import { analyze, analytics, money, WARNING } from "./calculations";
import type { Dataset, Mode } from "./model";
export function escapeHtml(value: unknown) {
  return String(value ?? "Белгісіз").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function buildReport(data: Dataset, mode: Mode) {
  const s = analytics(data);
  const e = escapeHtml;
  const pages = data.workloads.length ? 5 : 4;
  const appendix = data.workloads.length
    ? `<section><div class="brand">АКТИВ ЖҮКТЕМЕСІ</div><h2>5. Есептік қуат және нақты пайдалану</h2><p>Бұл қосымша негізгі KRI-ге қосылмайды. Төмен жүктеме бос актив санын, артық сатып алуды немесе үнем сомасын білдірмейді. Қарау шегі — пайдаланушы параметрі, құқықтық норматив емес.</p><table><tr><th>Ұйым / актив</th><th>Қуат / нақты</th><th>Жүктеме</th><th>Тексеру мәртебесі</th></tr>${data.workloads
        .slice(0, 5)
        .map((w) => {
          const a = utilization(w);
          return `<tr><td>${e(w.organization)}<br>${e(w.asset)}</td><td>${e(w.capacity)} / ${e(w.actual)} ${e(w.unit)}</td><td>${a.percentage === null ? "Есептелмейді" : a.percentage.toFixed(2) + "%"}<br>Шек: ${w.threshold}%</td><td>${e(a.status)}</td></tr>`;
        })
        .join(
          "",
        )}</table><p>Көрсетілгені ${Math.min(5, data.workloads.length)} / ${data.workloads.length}. Толық кесте «Актив жүктемесі» бөлімінен CSV/XLSX арқылы экспортталады.</p>${data.workloads
        .slice(0, 1)
        .map(
          (w) =>
            `<h3>Бірінші кейстің дәлелі</h3><p>${e(w.periodStart)} — ${e(w.periodEnd)}. Негіздеме: ${e(w.basis)}</p><p>Құжат: ${e(w.evidence.document)}. ${e(w.sourcePages)}. ${e(w.evidence.url)}. Дерек алынған күн: ${e(w.evidence.date)}.</p><p>Өтінімдегі жоспарланған сома: ${e(money(w.plannedAmount))}; бұл нақты төленген сома немесе үнем емес.</p><p>${e(w.expertConclusion || "Сарапшы қорытындысы енгізілмеген.")}</p>`,
        )
        .join(
          "",
        )}<p>Себептерді тексеру: шұғыл резерв, маман тапшылығы, жөндеу, жолдамалар және география. Белгісіз мәндерді нөлге айналдыруға болмайды.</p><footer>5 / 5 · ${e(WARNING)}</footer></section>`
    : "";
  return `<!DOCTYPE html><html lang="kk"><meta charset="utf-8"><title>QARJY CONTROL · түсініктеме жобасы</title><style>body{font:15px/1.7 Arial;color:#173249;margin:0;background:#edf1f5}section{background:white;width:180mm;min-height:245mm;padding:15mm;margin:10mm auto;box-sizing:border-box}h1{font-size:29px}h2{color:#126d70}table{border-collapse:collapse;font-size:11px;width:100%}td,th{border:1px solid #ccd5dd;padding:7px;text-align:left;overflow-wrap:anywhere}p{overflow-wrap:anywhere}.note{background:#f2f5f7;padding:12px}.brand{font-weight:bold;letter-spacing:2px}footer{margin-top:30px;border-top:1px solid #ccc;color:#64748b}@media print{body{background:white;font-size:14px;line-height:1.5}section{margin:0;padding:10mm;width:auto;min-height:0;break-after:page}p{margin-bottom:10px}h1{font-size:26px}h2{font-size:19px}h3{font-size:14px}td,th{padding:5px}footer{font-size:11px;margin-top:18px}section:last-child{break-after:auto}table{break-inside:auto}tr{break-inside:avoid}}@page{size:A4;margin:5mm}</style>
<section><div class="brand">QARJY CONTROL / VALUE GATE</div><h1>Мемлекеттік сатып алу қажеттілігін дәлелмен тексеру</h1><h2>1. Мақсат және шекара</h2><p>Түсініктеме жобасы · MVP 1.0 · ${new Date().toISOString().slice(0, 10)} · ${mode === "demo" ? "DEMO — Шартты дерек" : "Нақты дерек режимі"}</p><p>Бір кезең: мемлекеттік сатып алуды жоспарлау және қажеттілікті негіздеу. Бір негізгі тәуекел: нақты қажеттілік жеткіліксіз негізделгендіктен артық көлемде сатып алуға қаражат жоспарлау.</p><p>Себеп — қолданыстағы жарамды активтер мен қызметтік қажеттіліктің жеткіліксіз тексерілуі. Оқиға — шынайы қажеттіліктен артық көлемге қаржы жоспарлау. Салдар — артық шығын, пайдаланылмайтын активтер, ресурстардың тиімсіз бөлінуі.</p><p>Value Gate өтінім, қолда бар бос активтер, қызметтік нәтиже және бірдей мерзімдегі баламалардың шығындарын салыстырады. Белгісіз мәндер нөлмен алмастырылмайды.</p><p class="note">${e(WARNING)} Жүйе мемлекеттік органның өкілеттіктерін алмастырмайды, сатып алуды тоқтатпайды, сыбайлас жемқорлықты дәлелдемейді.</p><p>Дерекқор жергілікті SQLite файлында сақталады. Нақты және демонстрациялық деректер бөлек. Тұлғалардың ЖСН, телефоны немесе мекенжайы жиналмайды. Құжаттардың атауы мен сілтемелері сақталады; құжаттардың түпнұсқалығы автоматты тексерілмейді.</p><footer>1 / ${pages} · Түсініктеме жобасы, түпкілікті қорытынды емес</footer></section>
<section><div class="brand">ӘДІСТЕМЕ</div><h2>2. Есептеу және дәлел сапасы</h2><p>Жоспарланған сома = жоспарланған саны × бірлік бағасы. Негізделген жаңа саны = MAX(0, қажетті саны − жарамды бос активтер). Ықтимал артық көлем = MAX(0, жоспарланған саны − негізделген саны).</p><p>Қажетті саны — қосымша қамтамасыз етілетін орындар немесе алушылар. Тек функционалдық сәйкес, жарамды, бос және мерзімде қолжетімді активтер шегеріледі. Тізілім толықтығы, тексеруші, күні, дәлел және қолжетімділік белгісіз болса, қажеттілік қорытындысы шығарылмайды.</p><p>TCO = бастапқы + орнату + жөндеу + (жылдық қызмет көрсету + жылдық пайдалану) × ортақ мерзім + ауыстыру + өзге шығындар. Дисконттау қолданылмайды. Қызмет мерзімі ортақ мерзімді жаппаған балама салыстырылмайды.</p><p>Ықтимал шығын айырмасы = MAX(0, бастапқы салыстырмалы TCO − таңдалған салыстырмалы TCO). Балама қолмен таңдалады; қызметке сәйкес емес, дәлелсіз не шығыны толық емес нұсқа тиімді деп ұсынылмайды.</p><p>Нақты үнемді растауға бастапқы құжат, бекітілген өзгеріс, нақты қаржылық нәтиже және қызмет нәтижесінің сақталуы қажет. Міндеттеменің азаюы, ықтимал айырма және нақты үнем бөлек сақталады.</p><p>KRI = (негіздемесі жеткіліксіз толық тексерілген өтінімдер / толық тексерілген өтінімдер) × 100%. Бөлгіш нөл болса көрсеткіш шығарылмайды; дерегі толық емес өтінімдер бөлгішке кірмейді. Тәуекел балы қолданылмайды.</p><p>Дәрістегі таңдалған құрал — ${e(data.settings.lectureTool || "нақтылау қажет")}.</p><p>Құқықтық дереккөздер: adilet.zan.kz, goszakup.gov.kz. Қолданыстағы редакциясы қайта тексерілуі қажет. Халықаралық бағдарлар: OECD Public Procurement, World Bank Procurement Framework; нақты басылымдары қайта тексерілуі қажет. Бұл құжатта тексерілмеген баптар келтірілмейді.</p><footer>2 / ${pages} · Формулалар ашық және тестіленеді</footer></section>
<section><div class="brand">СЫНАҚ НӘТИЖЕЛЕРІ</div><h2>3. Деректер және шектеулер</h2><p>${s.total} өтінім. Толық тексерілген: ${s.complete}. Дерегі жеткіліксіз: ${s.incomplete}. KRI: ${s.kri === null ? "есептелмейді" : s.kri.toFixed(1) + "%"}.</p><p>Ықтимал шығын айырмасының белгілі мәндері: ${e(money(s.potential))}. Бюджеттен расталған үнем: ${e(money(s.saving))}. Белгісіз мәндер қосындыға кірмейді.</p><table><thead><tr><th>Өтінім</th><th>Мәртебе / қарау кезеңі</th><th>Артық көлем</th><th>Ықтимал айырма</th></tr></thead><tbody>${
    data.requests
      .slice(0, 5)
      .map((r) => {
        const a = analyze(r);
        return `<tr><td>${e(r.id)} · ${e(r.title)}</td><td>${e(a.status)}<br>${e(stageLabels[r.workflow.stage])}</td><td>${e(a.excess)}</td><td>${e(money(a.potentialDifference))}</td></tr>`;
      })
      .join("") ||
    '<tr><td colspan="4">Өтінім енгізілмеген — қорытынды жоқ</td></tr>'
  }</tbody></table><p>Өтінім кестесінде көрсетілгені ${Math.min(5, data.requests.length)} / ${data.requests.length}; толық нәтиже CSV/XLSX арқылы экспортталады.</p><p>${mode === "demo" ? "Шартты сынақ жазбалары" : "Ресми сынақ жазбалары"}: ${data.trials.length}. ${mode === "demo" ? "DEMO жазбалары нақты лоттар бойынша сынақтың орнына жүрмейді." : ""} 10 лоттың болуы 10 толық талдау жасалды дегенді білдірмейді. Ресми API интеграциясы қосылмаған.</p><table><tr><th>Ресми ID / URL / күн</th><th>Сынақ қорытындысы</th></tr>${
    data.trials
      .slice(0, 5)
      .map((t) => {
        const r = data.requests.find((r) => r.id === t.requestId);
        return `<tr><td>${e(t.officialId)}<br>${e(t.url)}<br>${e(t.date)}</td><td>${e(r && analyze(r).complete ? analyze(r).status : "Бұл лот бойынша негізгі тәуекелді тексеруге қажетті ішкі деректер жоқ")}</td></tr>`;
      })
      .join("") || '<tr><td colspan="2">Нақты сынақ өткізілмеген</td></tr>'
  }</table><p>Сынақ кестесінде көрсетілгені ${Math.min(5, data.trials.length)} / ${data.trials.length}; толық тізім сынақ XLSX экспортында.</p><p>Сыни бағалау: ${data.reviews.length} жазба. ${data.reviews.length ? "Сарапшы тұжырымдары: " + data.reviews.map((r) => e(r.expert)).join("; ") : "Жалған дабылдар мен өткізіп алған жағдайлар туралы сарапшы қорытындысы енгізілмеген."}</p><footer>3 / ${pages} · Үлкен кестелер қосымша беттерге жалғасуы мүмкін</footer></section>
<section><div class="brand">ЕНГІЗУ ЖӘНЕ ЖИ ЖУРНАЛЫ</div><h2>4. Енгізу жоспары</h2><p>Жауапты маман: ${e(data.settings.owner || "тағайындалуы қажет")}. Жиілік: ${e(data.settings.frequency || "нақтылануы қажет")}.</p><p>${e(data.settings.rollout || "Ұсынылатын жоба: 1) түгендеу мен дәлел жинау; 2) шектеулі пилот; 3) сарапшының қателерді тексеруі; 4) KRI мониторингі; 5) әдістемені қайта бағалау. Мерзімдер мен жауапкершілік бекітілмеген.")}</p><p>Шешімдер журналы: ${data.decisions.length} жазба. Бұл — ішкі бақылау журналы, абсолютті қорғалған аудит жүйесі емес.</p><h2>Нақты ЖИ итерациялары</h2><p>Тіркелген саны: ${data.iterations.length} / кемінде 3. Жоқ диалогтар нақты болғандай жазылмайды.</p>${
    data.iterations
      .slice(0, 3)
      .map(
        (i, n) =>
          `<p><strong>${n + 1}. ${e(i.createdAt)}</strong><br>Промпт: ${e(i.prompt)}<br>Шешім: ${e(i.decision)}</p>`,
      )
      .join("") ||
    "<p>Толтырылатын үлгі: нақты промпт → қабылданған шешім → тексеру → өзгерістер. Нақты итерациялар енгізілмеген.</p>"
  }<p>ЖИ журналының қысқаша көшірмесі берілді. Толық промпт, тексеру және өзгерістер «ЖИ журналы · CSV» экспортында.</p><h2>Келесі қадамдар</h2><p>Дәрістегі құралды нақтылау; ресми материалдар мен ішкі актив деректерін жинау; қолданыстағы құқықтық редакцияны тексеру; тәуелсіз сарапшы бағалауы. Кейінгі даму: мемлекеттік API, құжаттарды талдау, рөлдік авторизация, PostgreSQL және өндірістік қауіпсіздік.</p><footer>4 / ${pages} · ${e(WARNING)}</footer></section>${appendix}</html>`;
}
