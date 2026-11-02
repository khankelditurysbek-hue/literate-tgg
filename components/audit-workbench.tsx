"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  FileSearch,
  Files,
  FlaskConical,
  FolderOpen,
  GitCompareArrows,
  LayoutDashboard,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  blankCitation,
  newAuditCase,
  type AuditCase,
  type Citation,
  type SourceDocument,
  type BusinessOption,
} from "@/lib/audit-model";
import {
  assessBusinessCase,
  auditKri,
  citationIssues,
  inputLabels,
  parseSourceNumber,
  profiles,
} from "@/lib/audit-engine";
import { auditReportHtml, auditResultsCsv } from "@/lib/audit-report";
import {
  officialProgram,
  compareProgramSources,
  programTrialCsv,
} from "@/lib/official-program";
import "./audit-workbench.css";
type Mode = "real" | "demo";
type Tab =
  | "overview"
  | "trial"
  | "quantity"
  | "documents"
  | "market"
  | "business"
  | "report"
  | "method";
const tabs = [
  ["overview", "Тексеру үстелі", LayoutDashboard],
  ["quantity", "Қажеттілік есебі", ClipboardList],
  ["documents", "Құжаттар мен суреттер", Files],
  ["market", "Нарық салыстыруы", GitCompareArrows],
  ["business", "Бес сұрақтық негіздеме", BookOpen],
  ["trial", "Нақты бағдарлама сынағы", FlaskConical],
  ["report", "Нәтиже және есеп", FileSearch],
  ["method", "Әдіс және шектеулер", ShieldCheck],
] as const;
const fmt = (n: number | null, digits = 0) =>
  n === null
    ? "Белгісіз"
    : n.toLocaleString("kk-KZ", { maximumFractionDigits: digits });
const today = () => new Date().toISOString().slice(0, 10);
async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Сұрау орындалмады");
  return data;
}
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function Pill({ status }: { status: "flag" | "insufficient" | "clear" }) {
  return (
    <span className={`aq-pill ${status}`}>
      {status === "flag"
        ? "Артық көлем белгісі"
        : status === "clear"
          ? "Көлем бойынша белгі жоқ"
          : "Дерек жеткіліксіз"}
    </span>
  );
}
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="aq-notice">
      <ShieldCheck size={19} />
      <div>{children}</div>
    </div>
  );
}
function TextField({
  label,
  value,
  onChange,
  area = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  type?: string;
}) {
  return (
    <label className="aq-field">
      <span>{label}</span>
      {area ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function EvidenceEditor({
  value,
  onChange,
  documents,
  mode,
  label,
}: {
  value: Citation;
  onChange: (v: Citation) => void;
  documents: SourceDocument[];
  mode: Mode;
  label: string;
}) {
  const d = documents.find((doc) => doc.id === value.documentId),
    p = d?.pages.find((x) => x.page === value.page),
    issues = citationIssues(value, documents, mode);
  function patch(part: Partial<Citation>) {
    onChange({ ...value, ...part });
  }
  return (
    <div className="aq-evidence">
      <div className="aq-two">
        <TextField
          label={label}
          type="number"
          value={value.value === null ? "" : String(value.value)}
          onChange={(v) => patch({ value: v === "" ? null : Number(v) })}
        />
        <label className="aq-field">
          <span>Түпнұсқа файл</span>
          <select
            value={value.documentId}
            onChange={(e) =>
              patch({ documentId: e.target.value, page: 1, quote: "", raw: "" })
            }
          >
            <option value="">Құжат таңдалмаған</option>
            {documents.map((doc) => (
              <option value={doc.id} key={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details>
        <summary>
          {issues.length
            ? `${issues.length} толықтыру қажет`
            : `Құжатпен байланыс бар · ${value.page}-бет`}{" "}
          <ChevronRight size={14} />
        </summary>
        <div className="aq-two">
          <TextField
            label="Дерек беті"
            type="number"
            value={String(value.page)}
            onChange={(v) => patch({ page: Number(v) })}
          />
          <TextField
            label="Құжаттағы санның жазылуы"
            value={value.raw}
            onChange={(v) => patch({ raw: v })}
          />
        </div>
        <TextField
          label="Беттен дәл алынған үзінді"
          value={value.quote}
          onChange={(v) => patch({ quote: v })}
          area
        />
        {p && (
          <details className="aq-source-snippet">
            <summary>Танылған беттен сан таңдау</summary>
            <p>
              Санды таңдағанда мәні мен үзіндісі алынады. Өлшем мен мағынасын
              төменде түсіндіріңіз.
            </p>
            <div className="aq-lines">
              {p.text
                .split(/\n/)
                .filter((line) => /\d/.test(line))
                .slice(0, 100)
                .map((line, i) => (
                  <div key={i}>
                    <span>{line}</span>
                    <div>
                      {[
                        ...line.matchAll(
                          /\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?/g,
                        ),
                      ]
                        .slice(0, 20)
                        .map((m, j) => (
                          <button
                            key={j}
                            type="button"
                            onClick={() =>
                              patch({
                                raw: m[0],
                                value: parseSourceNumber(m[0]),
                                quote: line,
                              })
                            }
                          >
                            {m[0]}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </details>
        )}
        <TextField
          label="Өлшемі, кезеңі және осы есепке қатысы"
          value={value.context}
          onChange={(v) => patch({ context: v })}
          area
        />
        {issues.length ? (
          <ul className="aq-gaps">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        ) : (
          <p className="aq-positive">
            Үзінді мен сан техникалық тұрғыдан сәйкес. Түпнұсқалық пен мазмұнға
            тәуелсіз қорытынды берілген жоқ.
          </p>
        )}
      </details>
    </div>
  );
}
export function AuditWorkbench() {
  const [mode, setMode] = useState<Mode>("real"),
    [tab, setTab] = useState<Tab>("overview"),
    [cases, setCases] = useState<AuditCase[]>([]),
    [docs, setDocs] = useState<SourceDocument[]>([]),
    [version, setVersion] = useState(0),
    [selected, setSelected] = useState(""),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [docId, setDocId] = useState(""),
    [page, setPage] = useState(1),
    [forceOcr, setForceOcr] = useState(false),
    [history, setHistory] = useState<{ version: number; at: string }[]>([]),
    [preview, setPreview] = useState(""),
    [legacy, setLegacy] = useState<{ id: string; title: string }[] | null>(
      null,
    );
  const fileForm = useRef<HTMLFormElement>(null);
  const current = cases.find((c) => c.id === selected) || cases[0],
    result = current ? assessBusinessCase(current, docs) : null,
    kri = auditKri(cases, docs),
    source = docs.find((d) => d.id === docId) || docs[0],
    sourcePage = source?.pages.find((p) => p.page === page);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/audit?mode=${mode}`, { signal: controller.signal })
      .then(async (r) => {
        const response = await r.json();
        if (!r.ok) throw new Error(response.error);
        setCases(response.data.cases);
        setDocs(response.documents);
        setVersion(response.version);
        setHistory(response.history);
        setSelected(response.data.cases[0]?.id || "");
        setDocId(response.documents[0]?.id || "");
        setPage(1);
        setDirty(false);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [mode]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function edit(part: Partial<AuditCase>) {
    if (!current) return;
    setCases((old) =>
      old.map((c) =>
        c.id === current.id
          ? { ...c, ...part, updatedAt: new Date().toISOString() }
          : c,
      ),
    );
    setDirty(true);
    setMessage("");
  }
  async function task(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Қате");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    await task(async () => {
      const r = await api(`/api/audit?mode=${mode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { cases }, version }),
      });
      setCases(r.data.cases);
      setVersion(r.version);
      setDirty(false);
      setHistory((h) => [
        { version: r.version, at: new Date().toISOString() },
        ...h,
      ]);
      setMessage("Тексеру деректері сақталды. Бұл сатып алуға келісім емес.");
    });
  }
  function changeMode(m: Mode) {
    if (m === mode) return;
    if (
      dirty &&
      !confirm("Сақталмаған өзгеріс бар. Режим ауысқанда оны тастайсыз ба?")
    )
      return;
    setLoading(true);
    setError("");
    setMode(m);
    setPreview("");
    setLegacy(null);
  }
  function create() {
    const c = newAuditCase(mode);
    setCases((old) => [c, ...old]);
    setSelected(c.id);
    setDirty(true);
    setTab("quantity");
  }
  async function seed() {
    await task(async () => {
      const r = await api("/api/audit?mode=demo", { method: "POST" });
      setCases(r.data.cases);
      setDocs(r.documents);
      setVersion(r.version);
      setSelected(r.data.cases[0]?.id || "");
      setDocId(r.documents[0]?.id || "");
      setDirty(false);
      setMessage(
        "6 оқу сценарийі және олардың шартты бастапқы файлдары қосылды.",
      );
    });
  }
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await task(async () => {
      const d = await api(`/api/documents?mode=${mode}`, {
        method: "POST",
        body: form,
      });
      setDocs((old) => [...old, d]);
      setDocId(d.id);
      setPage(1);
      setPreview("");
      fileForm.current?.reset();
      setMessage(
        "Түпнұсқа сақталды. Қажетті бетті танып, санды есепке байланыстырыңыз.",
      );
    });
  }
  async function extract() {
    if (!source) return;
    await task(async () => {
      const d = await api(`/api/documents/extract?mode=${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: source.id, page, ocr: forceOcr }),
      });
      setDocs((old) => old.map((x) => (x.id === d.id ? d : x)));
      setMessage("Бет мәтіні алынды. Сандарды түпнұсқамен салыстырыңыз.");
    });
  }
  async function viewPage() {
    if (!source) return;
    await task(async () => {
      const r = await fetch(`/api/documents/preview?mode=${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: source.id, page }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setPreview(URL.createObjectURL(await r.blob()));
    });
  }
  function exportHtml() {
    download(
      `qarjy-${mode}-${today()}.html`,
      auditReportHtml(cases, docs, mode),
      "text/html;charset=utf-8",
    );
  }
  function exportCsv() {
    download(
      `qarjy-results-${mode}.csv`,
      auditResultsCsv(cases, docs),
      "text/csv;charset=utf-8",
    );
  }
  async function importLegacy(id: string) {
    await task(async () => {
      const r = await api(`/api/store?mode=${mode}`);
      const old = r.data.requests.find((x: { id: string }) => x.id === id);
      if (!old) throw new Error("Өтінім табылмады");
      const c = newAuditCase(mode);
      c.title = old.title;
      c.unit = old.unit;
      c.outcome = old.requiredOutcome;
      c.specification = old.category;
      c.inputs.planned.value = old.plannedQuantity;
      c.plannedPrice.value = old.unitPrice;
      c.strategy = old.justification;
      c.expertNote = `Бұрынғы өтінім ${id}: мәндер көшірілді, құжат файлдары тіркелмеген. Алдыңғы келісім/расталды белгілері қабылданбайды.`;
      setCases((prev) => [c, ...prev]);
      setSelected(c.id);
      setDirty(true);
      setTab("quantity");
      setMessage(
        "Бұрынғы дерек көшірілді. Түпнұсқа өтінім мен база сақталды; дәлелдері қайта байланыстырылуы керек.",
      );
    });
  }
  const visible = cases.filter((c) => {
    const s = assessBusinessCase(c, docs).quantity.status;
    return (
      (filter === "all" || s === filter) &&
      (c.title + " " + c.id).toLowerCase().includes(query.toLowerCase())
    );
  });
  return (
    <div className="aq-app">
      <aside className="aq-sidebar">
        <Link className="aq-brand" href="/">
          <span>
            <ShieldCheck size={23} />
          </span>
          <div>
            QARJY CONTROL<small>ҚАЖЕТТІЛІКТІ ДӘЛЕЛМЕН ТЕКСЕРУ</small>
          </div>
        </Link>
        <div className="aq-stage">
          <span>ТАҢДАЛҒАН КЕЗЕҢ</span>
          <strong>01 · Бюджеттік өтінім</strong>
          <p>Қажеттіліктен артық көлемге қаражат жоспарлау тәуекелі</p>
        </div>
        <nav>
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              aria-label={label}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={18} />
              {label}
              {id === "documents" && <small>{docs.length}</small>}
            </button>
          ))}
        </nav>
        <div className="aq-sidebar-bottom">
          <p>Дәріс, 1-құрал</p>
          <strong>Бес сұрақтық бизнес-кейс</strong>
          <a href="/archive" target="_blank" rel="noreferrer">
            Бұрынғы жұмыс кеңістігі <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <div className="aq-body">
        <header className="aq-header">
          <div>
            <span className="aq-eyebrow">
              VALUE GATE / ДӘЛЕЛ → ЕСЕП → ТЕКСЕРУ
            </span>
            <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>
          </div>
          <div className="aq-top-actions">
            <div className="aq-mode">
              <button
                className={mode === "real" ? "chosen" : ""}
                disabled={busy || loading}
                onClick={() => changeMode("real")}
              >
                Нақты дерек
              </button>
              <button
                className={mode === "demo" ? "chosen" : ""}
                disabled={busy || loading}
                onClick={() => changeMode("demo")}
              >
                DEMO
              </button>
            </div>
            <button
              className="aq-btn primary"
              disabled={busy || !dirty || loading}
              onClick={save}
            >
              <Save size={16} />
              {dirty ? "Өзгерістерді сақтау" : "Сақталған"}
            </button>
          </div>
        </header>
        <main className="aq-main" aria-busy={busy}>
          <fieldset className="aq-interactions" disabled={busy}>
            {error && (
              <div role="alert" className="aq-error">
                {error}
              </div>
            )}
            {message && (
              <div role="status" className="aq-success">
                <Check size={17} />
                {message}
                <button
                  aria-label="Хабарламаны жабу"
                  onClick={() => setMessage("")}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {mode === "demo" && (
              <div className="aq-demo">
                <div>
                  <FlaskConical size={22} />
                  <span>
                    <strong>
                      DEMO · Барлық ұйым, құжат және баға — шартты
                    </strong>
                    <small>
                      Нақты деректегі сынақ санына қосылмайды. Есеп ережесін
                      тексеруге арналған.
                    </small>
                  </span>
                </div>
                <button
                  className="aq-btn"
                  disabled={busy || dirty}
                  onClick={seed}
                >
                  6 сценарийді қосу
                </button>
              </div>
            )}
            {loading ? (
              <div className="aq-empty">Деректер жүктелуде…</div>
            ) : (
              <>
                {tab === "overview" && (
                  <>
                    <section className="aq-hero">
                      <div>
                        <span className="aq-eyebrow">
                          БІР КЕЗЕҢ · БІР ТӘУЕКЕЛ · АШЫҚ ЕСЕП
                        </span>
                        <h2>
                          Сұралған көлемнің
                          <br />
                          дәлелі жеткілікті ме?
                        </h2>
                        <p>
                          Өтінімдегі санды бастапқы құжатпен, қолдағы ресурспен
                          және қызмет көлемімен салыстырыңыз. Әр қорытындының
                          есебі мен дереккөзі ашылады.
                        </p>
                        <div className="aq-actions">
                          <button className="aq-btn primary" onClick={create}>
                            <Plus size={17} />
                            Жаңа тексеру
                          </button>
                          <button
                            className="aq-btn"
                            onClick={() => setTab("documents")}
                          >
                            <Upload size={16} />
                            Құжат енгізу
                          </button>
                        </div>
                      </div>
                      <div className="aq-chain">
                        <div>
                          <span>01</span>
                          <strong>Түпнұсқа құжат</strong>
                          <small>Файл · дереккөзі · күні · SHA-256</small>
                        </div>
                        <ChevronRight />
                        <div>
                          <span>02</span>
                          <strong>Сан және оның мағынасы</strong>
                          <small>Бет · үзінді · өлшем · кезең</small>
                        </div>
                        <ChevronRight />
                        <div>
                          <span>03</span>
                          <strong>Қайта тексерілетін нәтиже</strong>
                          <small>Формула · белгі · жетіспейтін дәлел</small>
                        </div>
                      </div>
                    </section>
                    <div className="aq-metrics">
                      <div>
                        <span>Артық көлем белгісі бар / есептелген</span>
                        <strong>
                          {kri.percent === null
                            ? "Есеп жоқ"
                            : `${fmt(kri.percent, 1)}%`}
                        </strong>
                        <small>
                          {kri.flagged} / {kri.complete} · Негізгі KRI
                        </small>
                      </div>
                      <div>
                        <span>Құжатқа байланған көлем есебі</span>
                        <strong>
                          {kri.complete}
                          <em> / {kri.total}</em>
                        </strong>
                        <small>Бұл құжаттың шынайылығын растау емес</small>
                      </div>
                      <div>
                        <span>Дерек жеткіліксіз</span>
                        <strong>{kri.incomplete}</strong>
                        <small>KRI бөлгішіне кірмейді; бөлек көрсетіледі</small>
                      </div>
                      <div>
                        <span>Тіркелген бастапқы файл</span>
                        <strong>{docs.length}</strong>
                        <small>Нақты үнем бұл есептен шығарылмайды</small>
                      </div>
                    </div>
                    <section className="aq-panel">
                      <div className="aq-panel-heading">
                        <div>
                          <h2>Тексерулер тізімі</h2>
                          <p>
                            Бір жол — бір қызметтік қажеттілік немесе бір
                            сметалық көлем.
                          </p>
                        </div>
                        <button className="aq-btn" onClick={create}>
                          <Plus size={16} />
                          Қосу
                        </button>
                      </div>
                      <div className="aq-toolbar">
                        <label className="aq-search">
                          <Search size={16} />
                          <input
                            placeholder="Тексеру атауы бойынша іздеу"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                        </label>
                        <select
                          aria-label="Есеп мәртебесі"
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                        >
                          <option value="all">Барлығы</option>
                          <option value="flag">Артық көлем белгісі</option>
                          <option value="insufficient">
                            Дерек жеткіліксіз
                          </option>
                          <option value="clear">Көлем бойынша белгі жоқ</option>
                        </select>
                      </div>
                      {visible.length ? (
                        <div className="aq-table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Тексеру / ереже</th>
                                <th>Жоспар</th>
                                <th>Есептік қажеттілік</th>
                                <th>Нәтиже</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {visible.map((c) => {
                                const r = assessBusinessCase(c, docs);
                                return (
                                  <tr key={c.id}>
                                    <td>
                                      <strong>{c.title}</strong>
                                      <small>{profiles[c.profile].name}</small>
                                    </td>
                                    <td>
                                      {fmt(c.inputs.planned.value, 2)} {c.unit}
                                    </td>
                                    <td>
                                      {fmt(r.quantity.need, 2)} {c.unit}
                                    </td>
                                    <td>
                                      <Pill status={r.quantity.status} />
                                    </td>
                                    <td>
                                      <button
                                        className="aq-link"
                                        onClick={() => {
                                          setSelected(c.id);
                                          setTab("quantity");
                                        }}
                                      >
                                        Есебін ашу <ArrowUpRight size={15} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="aq-empty">
                          <FileSearch size={35} />
                          <h3>Әзірге тексеру жоқ</h3>
                          <p>
                            Құжат енгізіп, жаңа тексеру жасаңыз немесе DEMO-да
                            есеп ережесін көріңіз.
                          </p>
                        </div>
                      )}
                    </section>
                    <div className="aq-two">
                      <section className="aq-panel aq-pad">
                        <h3>Бұрын енгізілген деректер</h3>
                        <p>
                          Ескі өтінімдер бөлек сақталған. Қажетті өтінімді
                          көшіріп, оның бастапқы құжаттарын осы тексеруге
                          байланыстыруға болады.
                        </p>
                        <button
                          className="aq-btn"
                          disabled={busy}
                          onClick={() =>
                            task(async () => {
                              const r = await api(`/api/store?mode=${mode}`);
                              setLegacy(r.data.requests);
                            })
                          }
                        >
                          <FolderOpen size={16} />
                          Бұрынғы өтінімдерді көрсету
                        </button>
                        {legacy && (
                          <div className="aq-legacy">
                            {legacy.length ? (
                              legacy.map((r) => (
                                <button
                                  key={r.id}
                                  onClick={() => importLegacy(r.id)}
                                >
                                  {r.title}
                                  <span>Көшіріп тексеру →</span>
                                </button>
                              ))
                            ) : (
                              <p>Осы режимде бұрынғы өтінім жоқ.</p>
                            )}
                          </div>
                        )}
                      </section>
                      <Notice>
                        Қызыл белгі — назар аудару сигналы. Есеп сатып алуға
                        рұқсат бермейді, сыбайлас жемқорлықты дәлелдемейді және
                        үнем сомасын растамайды. «Белгі жоқ» нәтижесі де сатып
                        алу қажеттілігінің кепілі емес.
                      </Notice>
                    </div>
                  </>
                )}
                {tab !== "overview" &&
                  tab !== "documents" &&
                  tab !== "trial" &&
                  tab !== "method" && (
                    <div className="aq-case-bar">
                      <label>
                        Ағымдағы тексеру
                        <select
                          aria-label="Ағымдағы тексеру"
                          value={current?.id || ""}
                          onChange={(e) => setSelected(e.target.value)}
                        >
                          {!cases.length && <option>Тексеру жоқ</option>}
                          {cases.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="aq-btn" onClick={create}>
                        <Plus size={16} />
                        Жаңа тексеру
                      </button>
                      {current && (
                        <button
                          className="aq-link aq-danger"
                          onClick={() => {
                            if (
                              confirm(
                                "Тексеруді жою керек пе? Түпнұсқа файлдар мен бұрынғы нұсқалар сақталады.",
                              )
                            ) {
                              setCases(
                                cases.filter((c) => c.id !== current.id),
                              );
                              setDirty(true);
                            }
                          }}
                        >
                          Жою
                        </button>
                      )}
                    </div>
                  )}
                {tab === "quantity" && current && result && (
                  <div className="aq-detail-grid">
                    <section className="aq-panel aq-pad">
                      <span className="aq-eyebrow">
                        1 · МӘСЕЛЕ ЖӘНЕ ЕСЕП ЕРЕЖЕСІ
                      </span>
                      <TextField
                        label="Тексеру атауы"
                        value={current.title}
                        onChange={(title) => edit({ title })}
                      />
                      <label className="aq-field">
                        <span>Сатып алу түріне сәйкес есеп</span>
                        <select
                          value={current.profile}
                          onChange={(e) =>
                            edit({
                              profile: e.target.value as AuditCase["profile"],
                            })
                          }
                        >
                          {Object.entries(profiles).map(([k, p]) => (
                            <option key={k} value={k}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p>{profiles[current.profile].description}</p>
                      <div className="aq-two">
                        <TextField
                          label="Бастапқы күн"
                          type="date"
                          value={current.periodStart}
                          onChange={(periodStart) => edit({ periodStart })}
                        />
                        <TextField
                          label="Соңғы күн"
                          type="date"
                          value={current.periodEnd}
                          onChange={(periodEnd) => edit({ periodEnd })}
                        />
                      </div>
                      <TextField
                        label="Жоспар мен нәтиженің өлшем бірлігі"
                        value={current.unit}
                        onChange={(unit) => edit({ unit })}
                      />
                      {current.profile === "consumables" && (
                        <label className="aq-field">
                          <span>Материалдың сатып алу бірлігі</span>
                          <select
                            value={current.rounding}
                            onChange={(e) =>
                              edit({
                                rounding: e.target
                                  .value as AuditCase["rounding"],
                              })
                            }
                          >
                            <option value="discrete">
                              Бүтін дана / қаптама — жоғары қарай дөңгелектеу
                            </option>
                            <option value="continuous">
                              Кг / литр / метр — бөлшек көлем, бүтінге
                              дөңгелектемеу
                            </option>
                          </select>
                        </label>
                      )}
                      <TextField
                        label="Қандай қызметтік нәтижені қамтамасыз ету керек?"
                        value={current.outcome}
                        onChange={(outcome) => edit({ outcome })}
                        area
                      />
                      <TextField
                        label="Техникалық сипаттама, қуат және ортақ өлшем негізі"
                        value={current.specification}
                        onChange={(specification) => edit({ specification })}
                        area
                      />
                      <div className="aq-section-label">
                        2 · САНДАРДЫ ТҮПНҰСҚАМЕН БАЙЛАНЫСТЫРУ
                      </div>
                      {profiles[current.profile].keys.map((k) => (
                        <EvidenceEditor
                          key={k}
                          label={inputLabels[k]}
                          value={current.inputs[k]}
                          onChange={(value) =>
                            edit({ inputs: { ...current.inputs, [k]: value } })
                          }
                          documents={docs}
                          mode={mode}
                        />
                      ))}
                      <button
                        className="aq-btn"
                        onClick={() => setTab("documents")}
                      >
                        <Upload size={16} />
                        Жетіспейтін құжатты енгізу
                      </button>
                    </section>
                    <aside className="aq-result-stack">
                      <section className="aq-result-card">
                        <span className="aq-eyebrow">
                          ЕСЕПТІҢ АҒЫМДАҒЫ НӘТИЖЕСІ
                        </span>
                        <Pill status={result.quantity.status} />
                        <div className="aq-result-number">
                          {fmt(result.quantity.need, 2)}
                          <small>{current.unit} · есептік қажеттілік</small>
                        </div>
                        <div className="aq-result-row">
                          <span>Жоспарланған</span>
                          <strong>
                            {fmt(current.inputs.planned.value, 2)}{" "}
                            {current.unit}
                          </strong>
                        </div>
                        <div className="aq-result-row">
                          <span>Есептен артық көлем</span>
                          <strong>
                            {fmt(result.quantity.excess, 2)} {current.unit}
                          </strong>
                        </div>
                        <code>{result.quantity.formula}</code>
                        <p>
                          Есеп кіріс құжаттарының дұрыстығына тәуелді. Құжаттағы
                          резерв, қызмет нормасы немесе қуат қате болса, нәтиже
                          де қате болады.
                        </p>
                      </section>
                      <section className="aq-panel aq-pad">
                        <h3>Қайта тексеру керек</h3>
                        {result.quantity.missing.length ? (
                          <ul className="aq-gaps">
                            {result.quantity.missing.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>
                            Міндетті сандардың файл, бет және үзіндімен
                            байланысы бар. Енді дереккөздің тәуелсіздігін, нақты
                            жағдайға сәйкестігін және резерв негізін маман
                            тексереді.
                          </p>
                        )}
                        <TextField
                          label="Сарапшы ескертпесі / жалған дабыл / есеп көрмейтін жағдай"
                          value={current.expertNote}
                          onChange={(expertNote) => edit({ expertNote })}
                          area
                        />
                      </section>
                      <Notice>
                        Құрылыс профилі тек бір физикалық көлемді салыстырады.
                        Сметалық коэффициенттер, материал сапасы, инженерлік
                        шешім және жобаның қауіпсіздігі бұл құралда
                        тексерілмейді.
                      </Notice>
                    </aside>
                  </div>
                )}
                {tab === "documents" && (
                  <>
                    <div className="aq-section-intro">
                      <h2>Файлдан есепке дейінгі із</h2>
                      <p>
                        Құжаттан мәтін алыңыз → түпнұсқамен салыстырыңыз → нақты
                        санды есепке байланыстырыңыз. Құжаттағы нұсқаулар
                        орындалмайды.
                      </p>
                    </div>
                    <div className="aq-document-grid">
                      <section className="aq-panel aq-pad">
                        <h3>
                          <Upload size={18} />
                          Бастапқы файл енгізу
                        </h3>
                        <p>
                          PDF, PNG, JPEG, TXT/CSV, XLSX · 8 МБ-қа дейін. ЖСН,
                          телефон және жеке мекенжайларды жүктемей тұрып алып
                          тастаңыз.
                        </p>
                        <form ref={fileForm} onSubmit={upload}>
                          <label className="aq-drop">
                            <Upload size={26} />
                            <span>Құжат немесе сурет таңдаңыз</span>
                            <input
                              required
                              name="file"
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.xlsx"
                            />
                          </label>
                          <label className="aq-field">
                            <span>Дереккөз / құжат иесі</span>
                            <input
                              name="source"
                              required
                              placeholder="Ресми портал, бөлім немесе А ұсынысы"
                            />
                          </label>
                          <label className="aq-field">
                            <span>Ресми сілтеме (болса)</span>
                            <input
                              name="url"
                              type="url"
                              placeholder="https://…"
                            />
                          </label>
                          <label className="aq-field">
                            <span>Дерек алынған күн</span>
                            <input
                              type="date"
                              name="date"
                              required
                              defaultValue={today()}
                            />
                          </label>
                          <label className="aq-field">
                            <span>Дереккөз түрі — пайдаланушы сипаттамасы</span>
                            <select name="origin">
                              {mode === "demo" ? (
                                <option value="demo">Шартты DEMO құжаты</option>
                              ) : (
                                <>
                                  <option value="internal">Ішкі құжат</option>
                                  <option value="official">
                                    Ресми жарияланым
                                  </option>
                                  <option value="market">Нарық ұсынысы</option>
                                </>
                              )}
                            </select>
                          </label>
                          <button
                            className="aq-btn primary"
                            disabled={busy}
                            type="submit"
                          >
                            <Upload size={16} />
                            Түпнұсқаны сақтау
                          </button>
                        </form>
                        <Notice>
                          Файл жергілікті SQLite базасында сақталады. Құжат
                          сыртқы ЖИ сервисіне жіберілмейді. SHA-256 сақталған
                          файлды айырады; қолтаңбаны не мазмұнның дұрыстығын
                          тексермейді.
                        </Notice>
                      </section>
                      <section className="aq-panel aq-pad">
                        <div className="aq-panel-heading">
                          <h3>Құжатты оқу және салыстыру</h3>
                          <span>{docs.length} файл</span>
                        </div>
                        {docs.length ? (
                          <>
                            <label className="aq-field">
                              <span>Құжат</span>
                              <select
                                aria-label="Оқылатын құжат"
                                value={source?.id || ""}
                                onChange={(e) => {
                                  setDocId(e.target.value);
                                  setPage(1);
                                  setPreview("");
                                }}
                              >
                                {docs.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {source && (
                              <>
                                <div className="aq-doc-meta">
                                  <strong>{source.name}</strong>
                                  <span>
                                    {source.source} · {source.date} ·{" "}
                                    {fmt(source.size / 1024)} КБ
                                  </span>
                                  {source.url && (
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Бастапқы жарияланым{" "}
                                      <ArrowUpRight size={13} />
                                    </a>
                                  )}
                                  <code>SHA-256 {source.sha256}</code>
                                </div>
                                <div className="aq-read-actions">
                                  <TextField
                                    label="Бет"
                                    type="number"
                                    value={String(page)}
                                    onChange={(v) => {
                                      setPage(Number(v));
                                      setPreview("");
                                    }}
                                  />
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={forceOcr}
                                      onChange={(e) =>
                                        setForceOcr(e.target.checked)
                                      }
                                    />
                                    Суреттен қайта тану (OCR)
                                  </label>
                                  <button
                                    className="aq-btn primary"
                                    disabled={busy || page < 1}
                                    onClick={extract}
                                  >
                                    {busy
                                      ? "Мәтін танылуда…"
                                      : "Бет мәтінін алу"}
                                  </button>
                                  <button
                                    className="aq-btn"
                                    disabled={busy}
                                    onClick={viewPage}
                                  >
                                    Бет суретін көрсету
                                  </button>
                                  <a
                                    className="aq-link"
                                    href={`/api/documents?mode=${mode}&id=${source.id}`}
                                  >
                                    <Download size={15} />
                                    Түпнұсқа
                                  </a>
                                </div>
                                <p className="aq-muted">
                                  PDF беттері бір-бірден оқылады. Танылғаны:{" "}
                                  {source.pages.length} / {source.totalPages}.
                                  OCR бірнеше секундтан бір минутқа дейін
                                  созылуы мүмкін.
                                </p>
                                <div className="aq-source-view">
                                  {preview && (
                                    <div>
                                      <span className="aq-eyebrow">
                                        САҚТАЛҒАН ТҮПНҰСҚА БЕТІ
                                      </span>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        alt="Түпнұсқа құжат беті"
                                        src={preview}
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <span className="aq-eyebrow">
                                      ТАНЫЛҒАН МӘТІН{" "}
                                      {sourcePage?.method === "ocr"
                                        ? `· OCR ${fmt(sourcePage.confidence, 0)}%`
                                        : ""}
                                    </span>
                                    <pre>
                                      {sourcePage?.text ||
                                        "Мәтін әлі алынбаған. «Бет мәтінін алу» батырмасын басыңыз."}
                                    </pre>
                                  </div>
                                </div>
                                <button
                                  className="aq-btn"
                                  onClick={() => setTab("quantity")}
                                >
                                  Қажеттілік есебіне өту{" "}
                                  <ChevronRight size={15} />
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="aq-empty">
                            <Files size={30} />
                            <p>Алғашқы файлды сол жақтан енгізіңіз.</p>
                          </div>
                        )}
                      </section>
                    </div>
                  </>
                )}
                {tab === "market" && current && result && (
                  <>
                    <Notice>
                      Нарықтық салыстыру — бизнес-кейстің қосымша дәлелі. Ол
                      артық көлем KRI-іне қосылмайды және «үнемделген ақша»
                      болып көрсетілмейді. Нақты жеткізушілердің орнына А, Б, В
                      белгілерін қолданыңыз.
                    </Notice>
                    <div className="aq-detail-grid">
                      <section className="aq-panel aq-pad">
                        <h2>Салыстыру шарттары</h2>
                        <p>
                          Тек бір сипаттама, бір өлшем, бірдей ҚҚС пен жеткізу
                          негізі. Валюта — теңге; басқа валюталар автоматты
                          ауыстырылмайды.
                        </p>
                        <EvidenceEditor
                          label="Жоспарланған бірлік баға, ₸"
                          value={current.plannedPrice}
                          onChange={(plannedPrice) => edit({ plannedPrice })}
                          documents={docs}
                          mode={mode}
                        />
                        <div className="aq-two">
                          {(["vat", "delivery"] as const).map((k) => (
                            <label className="aq-field" key={k}>
                              <span>{k === "vat" ? "ҚҚС" : "Жеткізу"}</span>
                              <select
                                value={current[k]}
                                onChange={(e) => edit({ [k]: e.target.value })}
                              >
                                <option value="unknown">Белгісіз</option>
                                <option value="included">Қосылған</option>
                                <option value="excluded">Қосылмаған</option>
                              </select>
                            </label>
                          ))}
                          <TextField
                            label="Қарау шегі, % (заңдық норматив емес)"
                            type="number"
                            value={String(current.marketThreshold)}
                            onChange={(v) =>
                              edit({ marketThreshold: Number(v) })
                            }
                          />
                          <TextField
                            label="Баға ескілігінің шегі, күн"
                            type="number"
                            value={String(current.maxQuoteAge)}
                            onChange={(v) => edit({ maxQuoteAge: Number(v) })}
                          />
                        </div>
                        <TextField
                          label="Нарық жағдайы және дереккөз тәуелсіздігінің шектеулері"
                          value={current.marketNote}
                          onChange={(marketNote) => edit({ marketNote })}
                          area
                        />
                        <div className="aq-panel-heading">
                          <h3>Нарық ұсыныстары</h3>
                          <button
                            className="aq-btn"
                            onClick={() =>
                              edit({
                                quotes: [
                                  ...current.quotes,
                                  {
                                    id: crypto.randomUUID(),
                                    alias: ["А", "Б", "В", "Г", "Д"][
                                      current.quotes.length % 5
                                    ],
                                    independenceGroup: "",
                                    price: blankCitation(),
                                    date: today(),
                                    specification: current.specification,
                                    unit: current.unit,
                                    currency: "KZT",
                                    vat: "unknown",
                                    delivery: "unknown",
                                    matches: "unknown",
                                    matchReason: "",
                                  },
                                ],
                              })
                            }
                          >
                            <Plus size={15} />
                            Ұсыныс қосу
                          </button>
                        </div>
                        {current.quotes.map((q, index) => {
                          const r = result.market.quotes[index],
                            patch = (part: Partial<typeof q>) =>
                              edit({
                                quotes: current.quotes.map((x) =>
                                  x.id === q.id ? { ...q, ...part } : x,
                                ),
                              });
                          return (
                            <details className="aq-offer" key={q.id}>
                              <summary>
                                <strong>
                                  {q.alias} ұсынысы · {fmt(q.price.value, 2)} ₸
                                </strong>
                                <span
                                  className={
                                    r.included ? "aq-positive" : "aq-amber"
                                  }
                                >
                                  {r.included
                                    ? "Медианаға кіреді"
                                    : `${r.reasons.length} себеппен кірмейді`}
                                </span>
                              </summary>
                              <div className="aq-two">
                                <TextField
                                  label="Жасырын белгісі (А, Б, В)"
                                  value={q.alias}
                                  onChange={(alias) => patch({ alias })}
                                />
                                <TextField
                                  label="Тәуелсіздік тобы"
                                  value={q.independenceGroup}
                                  onChange={(independenceGroup) =>
                                    patch({ independenceGroup })
                                  }
                                />
                                <TextField
                                  label="Баға күні"
                                  type="date"
                                  value={q.date}
                                  onChange={(date) => patch({ date })}
                                />
                                <TextField
                                  label="Өлшем бірлігі"
                                  value={q.unit}
                                  onChange={(unit) => patch({ unit })}
                                />
                              </div>
                              <EvidenceEditor
                                label="Ұсыныстағы бірлік баға, ₸"
                                value={q.price}
                                onChange={(price) => patch({ price })}
                                documents={docs}
                                mode={mode}
                              />
                              <TextField
                                label="Ұсыныстың толық салыстырылатын сипаттамасы"
                                value={q.specification}
                                onChange={(specification) =>
                                  patch({ specification })
                                }
                                area
                              />
                              <div className="aq-two">
                                {(["vat", "delivery"] as const).map((k) => (
                                  <label key={k} className="aq-field">
                                    <span>
                                      {k === "vat"
                                        ? "Ұсыныстағы ҚҚС"
                                        : "Ұсыныстағы жеткізу"}
                                    </span>
                                    <select
                                      value={q[k]}
                                      onChange={(e) =>
                                        patch({ [k]: e.target.value })
                                      }
                                    >
                                      <option value="unknown">Белгісіз</option>
                                      <option value="included">Қосылған</option>
                                      <option value="excluded">
                                        Қосылмаған
                                      </option>
                                    </select>
                                  </label>
                                ))}
                              </div>
                              <label className="aq-field">
                                <span>Қызметтік және техникалық сәйкестік</span>
                                <select
                                  value={q.matches}
                                  onChange={(e) =>
                                    patch({
                                      matches: e.target
                                        .value as typeof q.matches,
                                    })
                                  }
                                >
                                  <option value="unknown">Бағаланбаған</option>
                                  <option value="yes">
                                    Сәйкес деп негізделген
                                  </option>
                                  <option value="no">Сәйкес емес</option>
                                </select>
                              </label>
                              <TextField
                                label="Сәйкестік негіздемесі / тәуелсіздікті қалай тексердіңіз?"
                                value={q.matchReason}
                                onChange={(matchReason) =>
                                  patch({ matchReason })
                                }
                                area
                              />
                              {r.reasons.length > 0 && (
                                <ul className="aq-gaps">
                                  {r.reasons.map((m, i) => (
                                    <li key={i}>{m}</li>
                                  ))}
                                </ul>
                              )}
                              <button
                                className="aq-link aq-danger"
                                onClick={() =>
                                  edit({
                                    quotes: current.quotes.filter(
                                      (x) => x.id !== q.id,
                                    ),
                                  })
                                }
                              >
                                Ұсынысты жою
                              </button>
                            </details>
                          );
                        })}
                      </section>
                      <aside className="aq-result-stack">
                        <section className="aq-result-card">
                          <span className="aq-eyebrow">
                            САЛЫСТЫРМАЛЫ НАРЫҚ ЭТАЛОНЫ
                          </span>
                          <div className="aq-result-number">
                            {fmt(result.market.reference, 2)}
                            <small>₸ · медиана</small>
                          </div>
                          <div className="aq-result-row">
                            <span>Есепке кірген көздер</span>
                            <strong>
                              {result.market.eligible} / {current.quotes.length}
                            </strong>
                          </div>
                          <div className="aq-result-row">
                            <span>Бағаның ауытқуы</span>
                            <strong>
                              {result.market.deviation === null
                                ? "Есептелмейді"
                                : `${fmt(result.market.deviation, 1)}%`}
                            </strong>
                          </div>
                          <code>
                            (жоспар бағасы − медиана) / медиана × 100%
                          </code>
                          <p className={result.market.flag ? "aq-amber" : ""}>
                            {result.market.reference === null
                              ? "Кемінде 3 салыстырмалы, бөлек топтағы дереккөз керек."
                              : result.market.deviation === null
                                ? "Жоспарланған бағаны құжатқа байланыстырыңыз."
                                : result.market.flag
                                  ? "Баға ауытқуы қарау шегінен асты. Түсіндірме мен нарықты қайта тексеру қажет."
                                  : "Берілген шек бойынша баға ауытқуы белгісі жоқ."}
                          </p>
                        </section>
                        <Notice>
                          Тәуелсіздік тобы — талдаушының мәліметі. Құрал
                          компаниялардың түпкі иесін, сөз байласуды немесе
                          қолдан жасалған ұсынысты өзі анықтамайды. Бір файлдан
                          алынған бірнеше баға бір дереккөз ретінде саналады.
                        </Notice>
                      </aside>
                    </div>
                  </>
                )}
                {tab === "business" && current && result && (
                  <>
                    <div className="aq-five">
                      {result.five.map((q, i) => (
                        <div key={q.name} className={q.ready ? "ready" : ""}>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          <strong>{q.name}</strong>
                          <small>
                            {q.ready
                              ? "Дерек байланысы бар"
                              : "Толықтыру қажет"}
                          </small>
                        </div>
                      ))}
                    </div>
                    <div className="aq-detail-grid">
                      <section className="aq-panel aq-pad">
                        <h2>1 · Стратегиялық негіз</h2>
                        <TextField
                          label="Қандай мәселе бар, қандай дерек оны көрсетеді, қызмет неге керек?"
                          value={current.strategy}
                          onChange={(strategy) => edit({ strategy })}
                          area
                        />
                        <h2>2 · Экономикалық баламалар</h2>
                        <p>
                          Кемінде үш нұсқаны қараңыз. «Ештеңе істемеу»
                          нұсқасының салдары да жазылады; ол міндетті түрде
                          қажеттілікті қамтамасыз етпеуі мүмкін. Құн салыстыруы
                          бір мерзімде және бір қызмет нәтижесінде жасалады.
                        </p>
                        <button
                          className="aq-btn"
                          onClick={() =>
                            edit({
                              options: [
                                ...current.options,
                                {
                                  id: crypto.randomUUID(),
                                  label: "Жаңа нұсқа",
                                  kind: "buy",
                                  outcome: "",
                                  meetsNeed: "unknown",
                                  evidence: blankCitation(),
                                  initial: null,
                                  annual: null,
                                  endCost: null,
                                  horizon: 3,
                                },
                              ],
                            })
                          }
                        >
                          <Plus size={15} />
                          Балама қосу
                        </button>
                        {current.options.map((o, i) => {
                          const r = result.options[i],
                            patch = (part: Partial<BusinessOption>) =>
                              edit({
                                options: current.options.map((x) =>
                                  x.id === o.id ? { ...o, ...part } : x,
                                ),
                              });
                          return (
                            <details className="aq-offer" key={o.id}>
                              <summary>
                                <strong>{o.label}</strong>
                                <span>
                                  {fmt(r.total, 2)} ₸ / {o.horizon} жыл
                                </span>
                              </summary>
                              <div className="aq-two">
                                <TextField
                                  label="Нұсқа атауы"
                                  value={o.label}
                                  onChange={(label) => patch({ label })}
                                />
                                <label className="aq-field">
                                  <span>Нұсқа түрі</span>
                                  <select
                                    value={o.kind}
                                    onChange={(e) =>
                                      patch({
                                        kind: e.target
                                          .value as BusinessOption["kind"],
                                      })
                                    }
                                  >
                                    <option value="buy">Сатып алу</option>
                                    <option value="repair">Жөндеу</option>
                                    <option value="reuse">
                                      Бар ресурсты пайдалану
                                    </option>
                                    <option value="rent">Жалға алу</option>
                                    <option value="doNothing">
                                      Ештеңе істемеу
                                    </option>
                                  </select>
                                </label>
                                <TextField
                                  label="Бірдей есеп мерзімі, жыл"
                                  type="number"
                                  value={String(o.horizon)}
                                  onChange={(v) =>
                                    patch({ horizon: Number(v) })
                                  }
                                />
                                <label className="aq-field">
                                  <span>
                                    Қажетті нәтижені қамтамасыз ете ме?
                                  </span>
                                  <select
                                    value={o.meetsNeed}
                                    onChange={(e) =>
                                      patch({
                                        meetsNeed: e.target
                                          .value as BusinessOption["meetsNeed"],
                                      })
                                    }
                                  >
                                    <option value="unknown">Белгісіз</option>
                                    <option value="yes">
                                      Негізделген — иә
                                    </option>
                                    <option value="no">Жоқ</option>
                                  </select>
                                </label>
                              </div>
                              <TextField
                                label="Нәтижесі, сапасы және тәуекелі / ештеңе істемеу салдары"
                                value={o.outcome}
                                onChange={(outcome) => patch({ outcome })}
                                area
                              />
                              <div className="aq-two">
                                {(
                                  ["initial", "annual", "endCost"] as const
                                ).map((key, j) => (
                                  <TextField
                                    key={key}
                                    type="number"
                                    label={
                                      [
                                        "Бастапқы толық шығын, ₸",
                                        "Жыл сайынғы толық шығын, ₸",
                                        "Кезең соңындағы шығын, ₸",
                                      ][j]
                                    }
                                    value={
                                      o[key] === null ? "" : String(o[key])
                                    }
                                    onChange={(v) =>
                                      patch({
                                        [key]: v === "" ? null : Number(v),
                                      })
                                    }
                                  />
                                ))}
                              </div>
                              <EvidenceEditor
                                label="Құжатта көрсетілген бастапқы шығын, ₸"
                                value={o.evidence}
                                onChange={(evidence) => patch({ evidence })}
                                documents={docs}
                                mode={mode}
                              />
                              <p>
                                Формула: бастапқы + жылдық × мерзім + кезең
                                соңындағы шығын. Үзінді барлық шығын санын
                                қамтуы керек; дисконттау мен күрделі қаржы
                                моделі қолданылмайды.
                              </p>
                              {r.issues.length > 0 && (
                                <ul className="aq-gaps">
                                  {r.issues.map((m, j) => (
                                    <li key={j}>{m}</li>
                                  ))}
                                </ul>
                              )}
                              <button
                                className="aq-link aq-danger"
                                onClick={() =>
                                  edit({
                                    options: current.options.filter(
                                      (x) => x.id !== o.id,
                                    ),
                                  })
                                }
                              >
                                Нұсқаны жою
                              </button>
                            </details>
                          );
                        })}
                        <h2>3 · Нарық</h2>
                        <p>
                          Сәйкес ұсыныстар: {result.market.eligible}. Медиана:{" "}
                          {fmt(result.market.reference, 2)} ₸.
                        </p>
                        <button
                          className="aq-btn"
                          onClick={() => setTab("market")}
                        >
                          Нарық салыстыруын ашу <ChevronRight size={15} />
                        </button>
                        <h2>4 · Қаржылық негіз</h2>
                        <TextField
                          label="Қаржы көзі, бірдей мерзімдегі толық шығын және белгісіз шығындар"
                          value={current.financeNote}
                          onChange={(financeNote) => edit({ financeNote })}
                          area
                        />
                        <h2>5 · Нәтижеге жауапкершілік</h2>
                        <div className="aq-two">
                          <TextField
                            label="Жауапты бөлім / қызметтік рөл"
                            value={current.ownerRole}
                            onChange={(ownerRole) => edit({ ownerRole })}
                          />
                          <TextField
                            label="Нәтижені кейін тексеру күні"
                            type="date"
                            value={current.reviewDate}
                            onChange={(reviewDate) => edit({ reviewDate })}
                          />
                        </div>
                        <TextField
                          label="Қандай нәтиже өлшенеді, қай дерекпен?"
                          value={current.outcomeMetric}
                          onChange={(outcomeMetric) => edit({ outcomeMetric })}
                          area
                        />
                      </section>
                      <aside className="aq-result-stack">
                        <section className="aq-panel aq-pad">
                          <h3>Дәлел пакетінің құрамы</h3>
                          {result.five.map((q) => (
                            <div className="aq-checkline" key={q.name}>
                              <span
                                className={q.ready ? "aq-positive" : "aq-amber"}
                              >
                                {q.ready ? (
                                  <Check size={19} />
                                ) : (
                                  <Activity size={19} />
                                )}
                              </span>
                              <div>
                                <strong>{q.name}</strong>
                                <p>{q.detail}</p>
                              </div>
                            </div>
                          ))}
                          <Notice>
                            {result.packageComplete
                              ? "Бес бөлімде дерек байланысы бар. Бұл тәуелсіз растау немесе сатып алуға рұқсат емес."
                              : "Пакет толық емес. Қай бөлімде қандай дәлел жетпейтіні осы тізімде көрсетілген."}
                          </Notice>
                        </section>
                      </aside>
                    </div>
                  </>
                )}
                {tab === "report" && (
                  <>
                    <section className="aq-panel aq-pad">
                      <span className="aq-eyebrow">
                        ЕСЕПТЕУ НӘТИЖЕСІ · ҚАЙТА ТЕКСЕРУГЕ АРНАЛҒАН
                      </span>
                      <h2>Құжаттары мен формулалары көрсетілген есеп</h2>
                      <p>
                        Барлық тексерулер, бастапқы сандар, файлдардың SHA-256
                        ізі, бет пен үзінді, нарыққа кірмеген ұсыныстардың
                        себептері және шектеулер беріледі.
                      </p>
                      <div className="aq-actions">
                        <button className="aq-btn primary" onClick={exportHtml}>
                          <Download size={16} />
                          Толық HTML есеп
                        </button>
                        <button
                          className="aq-btn"
                          onClick={() =>
                            download(
                              `qarjy-explanation-${mode}.html`,
                              auditReportHtml(cases, docs, mode, true),
                              "text/html;charset=utf-8",
                            )
                          }
                        >
                          <Download size={16} />
                          3–5 беттік түсініктеме
                        </button>
                        <a
                          className="aq-btn"
                          aria-disabled={dirty}
                          href={
                            dirty ? undefined : `/api/audit/export?mode=${mode}`
                          }
                          title={
                            dirty
                              ? "Алдымен өзгерістерді сақтаңыз"
                              : "Сақталған деректерден Excel"
                          }
                        >
                          <Download size={16} />
                          Excel нәтижелері
                        </a>
                        <button className="aq-btn" onClick={exportCsv}>
                          <Download size={16} />
                          Нәтиже кестесі CSV
                        </button>
                        <button
                          className="aq-btn"
                          onClick={() =>
                            download(
                              `qarjy-${mode}-backup.json`,
                              JSON.stringify(
                                {
                                  format: "qarjy-audit-v2",
                                  mode,
                                  cases,
                                  documents: docs,
                                },
                                null,
                                2,
                              ),
                              "application/json",
                            )
                          }
                        >
                          <Download size={16} />
                          Деректер JSON
                        </button>
                      </div>
                      <p className="aq-muted">
                        HTML файлын браузерде ашып, Ctrl+P арқылы PDF сақтауға
                        болады. JSON түпнұсқа файл байттарын қамтымайды: толық
                        көшірме үшін серверді тоқтатып, data қалтасын сақтаңыз.
                      </p>
                    </section>
                    <div className="aq-two">
                      <section className="aq-panel aq-pad">
                        <h3>Тапсыруға дайындықтың нақты күйі</h3>
                        <ul className="aq-gaps">
                          <li>
                            Құрал жұмыс істейді: құжаттан мәтін алу, санды
                            үзіндіге байлау, санаттық есеп және нарық медианасы.
                          </li>
                          <li>
                            Нақты деректегі тексерулер:{" "}
                            {mode === "real"
                              ? cases.length
                              : "DEMO сынақ болып саналмайды"}
                            . Толық есептелгені:{" "}
                            {mode === "real" ? kri.complete : "—"}.
                          </li>
                          <li>
                            Дәрістегі құрал таңдалған: 1-құрал, бес сұрақтық
                            бизнес-кейс (8-бет).
                          </li>
                          <li>
                            Бір нақты 010 бюджеттік бағдарлама тексерілді: 12
                            ортақ ұяшықтың 7-еуі сәйкес емес. Нәтиже — деректі
                            нақтылау; артық көлем мен үнем анықталған жоқ.
                            «Нақты бағдарлама сынағы» бөлімінде кестесі бар.
                          </li>
                          <li>
                            Халықаралық түпнұсқаларды оқу күйі және шектеулер
                            есепте ашық жазылады.
                          </li>
                        </ul>
                      </section>
                      <section className="aq-panel aq-pad">
                        <h3>Сақтау тарихы</h3>
                        <p>
                          Әр сақтау серверде жаңа нұсқа жасайды. Тарих
                          жергілікті база әкімшісінің өзгертуінен қорғалған
                          аудит жүйесі емес.
                        </p>
                        {history.slice(0, 10).map((h) => (
                          <div className="aq-result-row" key={h.version}>
                            <span>Нұсқа {h.version}</span>
                            <span>
                              {new Date(h.at).toLocaleString("kk-KZ")}
                            </span>
                          </div>
                        ))}
                        {!history.length && <p>Сақталған нұсқа жоқ.</p>}
                      </section>
                    </div>
                    {result && (
                      <section className="aq-panel aq-pad">
                        <h3>{current.title}</h3>
                        <Pill status={result.quantity.status} />
                        <p>
                          Жоспар: {fmt(current.inputs.planned.value, 2)}{" "}
                          {current.unit}. Құжатқа байланған қажеттілік:{" "}
                          {fmt(result.quantity.need, 2)} {current.unit}. Есептен
                          артық: {fmt(result.quantity.excess, 2)} {current.unit}
                          .
                        </p>
                        <code>{result.quantity.formula}</code>
                        <p>
                          {current.expertNote ||
                            "Сарапшының сыни бағасы әлі жазылмаған."}
                        </p>
                      </section>
                    )}
                  </>
                )}
                {tab === "trial" && (
                  <>
                    <section className="aq-panel aq-pad">
                      <span className="aq-eyebrow">
                        БІР НАҚТЫ БЮДЖЕТТІК БАҒДАРЛАМА · АШЫҚ ДЕРЕКТЕГІ СЫНАҚ
                      </span>
                      <h2>010 · {officialProgram.title}</h2>
                      <p>
                        {officialProgram.administrator}. Алынған күні:{" "}
                        {officialProgram.retrievedAt}. Қосымшаның порталдағы
                        күні: {officialProgram.attachmentAddedAt}.
                      </p>
                      <div className="aq-actions">
                        <a
                          className="aq-btn"
                          href={officialProgram.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ресми бағдарлама <ArrowUpRight size={15} />
                        </a>
                        <a
                          className="aq-btn"
                          href={officialProgram.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ресми XLS қосымшасы <ArrowUpRight size={15} />
                        </a>
                        <button
                          className="aq-btn primary"
                          onClick={() =>
                            download(
                              "real-program-010-results.csv",
                              programTrialCsv(),
                              "text/csv;charset=utf-8",
                            )
                          }
                        >
                          <Download size={15} />
                          Нақты сынақ кестесі
                        </button>
                      </div>
                    </section>
                    <Notice>
                      <strong>
                        Қажеттілік есебіне дерек қабылданбады: жыл бағандары
                        сәйкес емес.
                      </strong>{" "}
                      Портал: {officialProgram.portalYears.join(" · ")}. Excel:{" "}
                      {officialProgram.attachmentYears.join(" · ")}. Бір
                      бағдарламаның екі көрінісі салыстырылды; бұл тәуелсіз екі
                      нарық көзі емес.
                    </Notice>
                    <section className="aq-panel">
                      <div className="aq-panel-heading">
                        <div>
                          <h2>
                            {compareProgramSources().mismatches} /{" "}
                            {compareProgramSources().total} ортақ ұяшықта мән
                            сәйкес емес
                          </h2>
                          <p>
                            Бірдей көрсеткіш, жыл және өлшем бойынша автоматты
                            салыстыру. Бұл артық шығын саны емес.
                          </p>
                        </div>
                      </div>
                      <div className="aq-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Көрсеткіш</th>
                              <th>Жыл / өлшем</th>
                              <th>Портал кестесі</th>
                              <th>XLS қосымшасы</th>
                              <th>Тексеру</th>
                            </tr>
                          </thead>
                          <tbody>
                            {compareProgramSources().rows.map((r) => (
                              <tr key={r.key + r.year}>
                                <td>
                                  <strong>{r.name}</strong>
                                  <small>{r.cells}</small>
                                </td>
                                <td>
                                  {r.year} · {r.unit}
                                </td>
                                <td>{fmt(r.portal, 1)}</td>
                                <td>{fmt(r.attachment, 1)}</td>
                                <td>
                                  <span
                                    className={
                                      r.matches ? "aq-positive" : "aq-amber"
                                    }
                                  >
                                    {r.matches ? "Сәйкес" : "Нақтылау керек"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                    <div className="aq-two">
                      <section className="aq-panel aq-pad">
                        <h3>Құралдың нақты нәтижесі</h3>
                        <p>{officialProgram.note}</p>
                        <p>
                          Ішкі қызмет көлемі, бос ресурс, іс-шараның нақты
                          құрамы және салыстырмалы нарық ұсыныстары берілмеген.
                          Сондықтан бағдарлама бюджетін қызметкер немесе жоба
                          санына бөліп «бірлік баға» жасауға болмайды.
                        </p>
                        <p>
                          <strong>Әрекет:</strong> жоспарлау бөлімі
                          бағдарламаның қолданыстағы нұсқасын және жыл
                          бағандарын құжат иесімен нақтылайды; содан кейін жеке
                          қызметтік қажеттілікке есеп ашады. Бұл кейс негізгі
                          көлем KRI-іне қосылмайды.
                        </p>
                      </section>
                      <section className="aq-panel aq-pad">
                        <h3>Қайта тексеру ізі</h3>
                        <p>
                          Порталда «Бюджеттік бағдарламаның шығыстары» және
                          «Тікелей нәтиже көрсеткіштері» кестелерін ашыңыз. XLS
                          файлында «010 каз» / «010 рус» парақтарының
                          көрсетілген ұяшықтарымен салыстырыңыз.
                        </p>
                        <p>
                          Дерек қолмен көшіріліп, екі тілдегі XLS парақтарымен
                          салыстырылды; кестедегі теңдік тексеруі кодпен
                          орындалады. Осы көшірме ресми құжаттың орнына
                          жүрмейді. Қоғамдық деректер; жеке тұлға аты, ЖСН,
                          телефон және мекенжай көшірілген жоқ.
                        </p>
                        <div className="aq-doc-meta">
                          <span>Жүктелген түпнұсқа XLS SHA-256</span>
                          <code>{officialProgram.fileSha256}</code>
                        </div>
                      </section>
                    </div>
                  </>
                )}
                {tab === "method" && (
                  <section className="aq-panel aq-pad aq-method">
                    <span className="aq-eyebrow">
                      БАСТАПҚЫ ИДЕЯ ЖӘНЕ ТАПСЫРМАҒА СӘЙКЕСТІК
                    </span>
                    <h2>Негізсіз көлемді ерте тексеру</h2>
                    <p>
                      <strong>Кезең:</strong> 1 — бюджеттік өтінім, қажеттілікті
                      негіздеу (дәрістің 2-беті). <strong>Бір тәуекел:</strong>{" "}
                      қолдағы ресурс пен нақты қызметтік қажеттілік
                      тексерілмейді → қажеттіліктен артық көлемге қаражат
                      сұралады → пайдаланылмайтын активтер мен тиімсіз шығын
                      қаупі туады.
                    </p>
                    <h3>Таңдалған құрал — бес сұрақтық бизнес-кейс</h3>
                    <p>
                      Дәрістің 8-беті: стратегия, экономика, нарық, қаржы,
                      басқару. Құрал осы сұрақтарды санға, бастапқы құжатқа және
                      қайта есептелетін ережеге байланыстырады. Түпнұсқа дәріс —
                      сіз жүктеген «10 Сатып алудағы сыбайлас жемқорлық
                      тәуекелдері басқару құралдары.pdf», 15 бет; қаралған күні
                      2026-11-02.
                    </p>
                    <h3>Негізгі KRI</h3>
                    <code>
                      Артық көлем белгісі бар құжатқа байланған есептер / барлық
                      құжатқа байланған көлем есептері × 100%
                    </code>
                    <p>
                      Дерегі жеткіліксіз тексерулер бөлек беріледі. Бөлгіш 0
                      болса пайыз жоқ. Қамту — толық есептелген / барлық өтінім
                      — қатар көрсетіледі. KRI-дің төмендеуі өздігінен жақсаруды
                      дәлелдемейді: дерексіз өтінімдер көбейгенде де төмендеуі
                      мүмкін.
                    </p>
                    <h3>Енгізу</h3>
                    <p>
                      Иесі — органның жоспарлау және экономикалық талдау бөлімі.
                      Әр бюджеттік өтінім берілер алдында және көлем өзгерген
                      сайын қолданылады. Қажетті дерек: жоспар, қызмет көлемінің
                      негізі, жарамды ресурстар тізімі, резерв түсіндірмесі,
                      техникалық сипаттама және салыстырмалы нарық ұсыныстары.
                      Өзге бөлім маманы түпнұсқалар мен болжамдарды тексереді.
                      Бағдарлама осы маманның өкілеттігін тексермейді және
                      келісім рәсімдемейді.
                    </p>
                    <h3>Халықаралық негіз</h3>
                    <p>
                      OECD Recommendation of the Council on Public Procurement
                      (2015), OECD/LEGAL/0411: бағалау, тәуекелді басқару,
                      есептілік және бюджетпен интеграция қағидалары. GAO, A
                      Framework for Managing Fraud Risks in Federal Programs
                      (2015), GAO-15-593SP: тәуекелді бағалау, алдын алушы
                      бақылау және нәтижесін бағалау. Бұл екеуі дәрістің 7, 8
                      және 13-беттерінде аталған. Түпнұсқаны оқу күйі
                      түсініктемеде көрсетіледі; халықаралық ұйымдар осы
                      жергілікті формулаларды немесе 25% шегін бекітті деген
                      тұжырым жасалмайды.
                    </p>
                    <a
                      href="https://legalinstruments.oecd.org/en/instruments/OECD-LEGAL-0411"
                      target="_blank"
                      rel="noreferrer"
                    >
                      OECD ресми құжаты ↗
                    </a>
                    <br />
                    <a
                      href="https://www.gao.gov/products/gao-15-593sp"
                      target="_blank"
                      rel="noreferrer"
                    >
                      GAO ресми құжаты ↗
                    </a>
                    <h3>Құрал нені көрмейді?</h3>
                    <p>
                      Жалған немесе келісілген құжаттар, жасырын бенефициарлар,
                      шынайы қызмет қажеттілігінің әдейі бұрмалануы, дұрыс емес
                      инженерлік/клиникалық норматив, тауар сапасы және нақты
                      төлемдер автоматты анықталмайды. OCR санды қате тануы
                      мүмкін. Сурет заттың барын, алынған уақытын немесе
                      қажеттілігін дәлелдемейді. Файл хэші — тек сақталған
                      байттардың ізі.
                    </p>
                    <h3>ЖИ қатесі және түзету</h3>
                    <p>
                      Алғашқы нұсқада ортақ сан формуласы, құжатсыз растау
                      белгісі және келісім кезеңдері шамадан тыс қолданылды.
                      Сіздің сыни тексеруіңізден кейін олар негізгі өнімнен
                      алынып, санаттық ереже, файлға байланған дәлел және
                      қорытынды шектері енгізілді. DEMO-ны нақты сынақ ретінде
                      көрсетуге болмайды.
                    </p>
                    <button
                      className="aq-btn"
                      onClick={() =>
                        download(
                          "qarjy-ai-journal.md",
                          `# ЖИ журналы\n\nКүні: 2026-11-02\n\n1. Пайдаланушы QARJY CONTROL арқылы жоспарлау кезіндегі қажеттілікті тексеретін цифрлық құрал жасауды тапсырды. ЖИ ұсынды: өтінімдер, активтер, TCO және ішкі қарау. Қабылданды: сандық есеп пен сақтау. Қате: құжатсыз растау және әр түрге ортақ ереже.\n\n2. Пайдаланушы: «ал енді келісім қалай беріледі негізі, толықтығын қалай растайды». ЖИ түсіндірді: жалауша нақты тексеру емес, рөлдік авторизация жоқ. Бұл шектеу анықталды; келісім мүмкіндігі толық шешім деп қабылданбады.\n\n3. Пайдаланушы: «мемлекеттік жобалар ... түріне қарай тексеруде әртүрлі болады ... бастапқы идеямызға ... келіспейді ... қайтадан қарап шық, толықтыр». Түзету: бір тәуекел сақталды; жабдық, материал, қызмет, сметалық жол үшін бөлек формулалар; түпнұсқа файл, OCR, үзінді, нарық медианасы, бес сұрақтық бизнес-кейс. Себебі: әкімшілік белгілердің орнына дәлел мен есеп керек.\n\n4. Пайдаланушы 15 беттік дәрісті берді. ЖИ нақты 1-құралды (8-бет) таңдады, 2-құралдың медианасын (9-бет) қосымша ретінде қолданды. Алдыңғы «дәріс құралы белгісіз» олқылығы жойылды.\n\nБұл журнал осы сөйлесудегі оқиғаларды сипаттайды; пайдаланушының әлі болмаған тексеруі немесе мақұлдауы ойдан жазылмаған. ЖИ соңғы редакцияны өзі дайындады; пайдаланушы оны бағалап, қабылдау/түзету шешімін өзі тіркеуі керек.\n`,
                          "text/markdown;charset=utf-8",
                        )
                      }
                    >
                      <Download size={16} />
                      Нақты сөйлесуге негізделген ЖИ журналы
                    </button>
                  </section>
                )}
                {!current &&
                  ["quantity", "market", "business"].includes(tab) && (
                    <div className="aq-empty">
                      <ClipboardList size={34} />
                      <h3>Алдымен тексеру қосыңыз</h3>
                      <button className="aq-btn primary" onClick={create}>
                        Жаңа тексеру
                      </button>
                    </div>
                  )}
              </>
            )}
            <footer className="aq-footer">
              <span>QARJY CONTROL · Value Gate 2</span>
              <span>
                Дәлелді есеп · Адамның сыни тексеруі · Заңды өзгертпей қолдану
              </span>
            </footer>
          </fieldset>
        </main>
      </div>
    </div>
  );
}
