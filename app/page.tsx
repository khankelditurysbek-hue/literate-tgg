"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Boxes,
  GitCompareArrows,
  ChartNoAxesCombined,
  TriangleAlert,
  FlaskConical,
  BookOpen,
  FileChartColumn,
  Scale,
  Search,
  Plus,
  ArrowUpRight,
  Download,
  Menu,
  X,
  Check,
  ChevronRight,
  Activity,
  History,
  BrainCircuit,
  RefreshCw,
} from "lucide-react";
import {
  analyze,
  analytics,
  decisionDays,
  money,
  tco,
  WARNING,
} from "@/lib/calculations";
import {
  emptyDataset,
  emptyEvidence,
  emptyFinance,
  type Dataset,
  type Request,
  type Mode,
  type Asset,
  type Alternative,
} from "@/lib/model";
import { demoDataset } from "@/lib/demo";
import { buildReport } from "@/lib/report";
import { Workloads } from "@/components/workloads";
type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "checkbox";
  required?: boolean;
  options?: [string, string][];
  hint?: string;
};
type Editor = {
  title: string;
  fields: Field[];
  value: Record<string, unknown>;
  submit: (value: Record<string, unknown>) => Promise<void>;
};
const NAV = [
  ["dashboard", "Басқару панелі", LayoutDashboard],
  ["requests", "Сатып алу өтінімдері", ClipboardList],
  ["need", "Қажеттілікті тексеру", ShieldCheck],
  ["assets", "Активтер тізілімі", Boxes],
  ["workloads", "Актив жүктемесі", Activity],
  ["alternatives", "Баламаларды салыстыру", GitCompareArrows],
  ["finance", "Қаржылық тиімділік", ChartNoAxesCombined],
  ["risks", "Тәуекелдер мен ескертулер", TriangleAlert],
  ["trials", "Нақты деректермен сынақ", FlaskConical],
  ["decisions", "Шешімдер журналы", BookOpen],
  ["reports", "Есептер және аналитика", FileChartColumn],
  ["method", "Жоба әдістемесі", Scale],
  ["review", "Сыни бағалау", Search],
  ["iterations", "ЖИ итерациялары", BrainCircuit],
] as const;
const reliability: [string, string][] = [
  ["official", "Ресми расталған дерек"],
  ["documented", "Құжаттық расталған дерек"],
  ["unverified", "Пайдаланушы енгізген, тексерілмеген дерек"],
  ["demo", "Демонстрациялық дерек"],
];
const today = () => new Date().toISOString().slice(0, 10);
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const f = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  required = false,
): Field => ({ key, label, type, required });
const evFields = (mode: Mode): Field[] => [
  f("evidence.source", "Ақпарат көзі"),
  f("evidence.document", "Дәлел құжатының атауы"),
  f("evidence.url", "Дереккөз URL (HTTP/HTTPS)"),
  f("evidence.date", "Дерек алынған күн", "date"),
  {
    ...f("evidence.reliability", "Дерек сенімділігі", "select"),
    options: reliability.filter(([k]) =>
      mode === "demo" ? k === "demo" : k !== "demo",
    ),
  },
  f("evidence.verified", "Дерек пен құжатты тексердім", "checkbox"),
];
function get(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (a, k) =>
        a && typeof a === "object"
          ? (a as Record<string, unknown>)[k]
          : undefined,
      obj,
    );
}
function put(obj: Record<string, unknown>, path: string, val: unknown) {
  const parts = path.split(".");
  let parent = obj;
  parts.slice(0, -1).forEach((k) => {
    if (!parent[k] || typeof parent[k] !== "object") parent[k] = {};
    parent = parent[k] as Record<string, unknown>;
  });
  parent[parts.at(-1)!] = val;
}
function badge(status: string) {
  return (
    <span
      className={`badge ${status === "Негіздеме жеткілікті" ? "green" : status === "Дерек жеткіліксіз" ? "gray" : "amber"}`}
    >
      <span />
      {status}
    </span>
  );
}
function Empty({
  text = "Әзірге дерек жоқ",
  detail = "Жаңа жазба қосыңыз немесе CSV/XLSX файлын импорттаңыз.",
}: {
  text?: string;
  detail?: string;
}) {
  return (
    <div className="empty">
      <ClipboardList size={32} />
      <strong>{text}</strong>
      <p>{detail}</p>
    </div>
  );
}
function Modal({ editor, close }: { editor: Editor; close: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = structuredClone(editor.value);
    for (const field of editor.fields) {
      const raw = form.get(field.key);
      put(
        value,
        field.key,
        field.type === "checkbox"
          ? raw === "on"
          : field.type === "number"
            ? raw === ""
              ? null
              : Number(raw)
            : (raw ?? ""),
      );
    }
    setBusy(true);
    try {
      await editor.submit(value);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Қате");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="overlay">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal"
      >
        <header>
          <div>
            <span className="eyebrow">QARJY CONTROL / ДЕРЕК ЕНГІЗУ</span>
            <h2 id="modal-title">{editor.title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Жабу"
            disabled={busy}
            onClick={close}
          >
            <X />
          </button>
        </header>
        <p className="muted">
          Бос сандық өріс — «Белгісіз». Нақты нөлді 0 деп енгізіңіз. * —
          міндетті өріс.
        </p>
        <form onSubmit={submit}>
          <div className="form-grid">
            {editor.fields.map((field) => (
              <label
                key={field.key}
                className={
                  field.type === "textarea"
                    ? "span2"
                    : field.type === "checkbox"
                      ? "checkbox"
                      : ""
                }
              >
                <span>
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {field.type === "textarea" ? (
                  <textarea
                    name={field.key}
                    defaultValue={String(get(editor.value, field.key) ?? "")}
                    required={field.required}
                  />
                ) : field.type === "select" ? (
                  <select
                    name={field.key}
                    defaultValue={String(get(editor.value, field.key) ?? "")}
                    required={field.required}
                  >
                    {field.options?.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.key}
                    type={field.type || "text"}
                    min={field.type === "number" ? 0 : undefined}
                    step={field.type === "number" ? "any" : undefined}
                    defaultChecked={
                      field.type === "checkbox"
                        ? Boolean(get(editor.value, field.key))
                        : undefined
                    }
                    defaultValue={
                      field.type !== "checkbox"
                        ? String(get(editor.value, field.key) ?? "")
                        : undefined
                    }
                    required={field.required}
                  />
                )}
                {field.hint && <small>{field.hint}</small>}
              </label>
            ))}
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <footer>
            <button
              className="button secondary"
              type="button"
              onClick={close}
              disabled={busy}
            >
              Бас тарту
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? "Сақталуда…" : "Сақтау"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
export default function Home() {
  const [mode, setMode] = useState<Mode>("real");
  const [data, setData] = useState<Dataset>(emptyDataset);
  const [version, setVersion] = useState(0);
  const [page, setPage] = useState("dashboard");
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<{
    kind: "requests" | "trials";
    rows: unknown[];
  } | null>(null);
  const [history, setHistory] = useState<
    { id: number; version: number; changed_at: string }[]
  >([]);
  async function reload() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/store?mode=${mode}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json.data);
      setVersion(json.version);
      setHistory(json.history);
      setSelected((s) =>
        json.data.requests.some((r: Request) => r.id === s)
          ? s
          : json.data.requests[0]?.id || "",
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    fetch(`/api/store?mode=${mode}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (active) {
          setData(json.data);
          setVersion(json.version);
          setHistory(json.history);
          setSelected(json.data.requests[0]?.id || "");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [mode]);
  async function persist(next: Dataset) {
    if (saving) throw new Error("Алдыңғы сақтау аяқталсын");
    setSaving(true);
    try {
      const res = await fetch(`/api/store?mode=${mode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: next, version }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json.data);
      setVersion(json.version);
      setNotice("Өзгерістер сақталды");
      setHistory((h) => [
        { id: Date.now(), version: json.version, changed_at: now() },
        ...h,
      ]);
    } finally {
      setSaving(false);
    }
  }
  function run(action: () => Promise<unknown>) {
    setError("");
    setNotice("");
    action().catch((e) => setError(e instanceof Error ? e.message : "Қате"));
  }
  function navigate(value: string) {
    setPage(value);
    setMobile(false);
    setQuery("");
  }
  function changeMode(value: Mode) {
    if (value === mode) return;
    setLoading(true);
    setError("");
    setNotice("");
    setPreview(null);
    setEditor(null);
    setMode(value);
  }
  const request = data.requests.find((r) => r.id === selected);
  const analysis = request ? analyze(request) : null;
  const stats = analytics(data);
  const nav = NAV.find((n) => n[0] === page)!;
  async function saveRequest(r: Request) {
    await persist({
      ...data,
      requests: data.requests.some((x) => x.id === r.id)
        ? data.requests.map((x) => (x.id === r.id ? r : x))
        : [...data.requests, r],
    });
    setSelected(r.id);
  }
  function editRequest(existing?: Request) {
    const stamp = now();
    const value = existing || {
      id: "",
      organization: "",
      title: "",
      category: "",
      plannedQuantity: null,
      unit: "дана",
      unitPrice: null,
      requiredOutcome: "",
      requiredQuantity: null,
      horizon: 3,
      evidence: emptyEvidence(mode === "demo"),
      justification: "",
      inventoryConfirmed: false,
      assets: [],
      alternatives: [],
      finance: { ...emptyFinance(), evidence: emptyEvidence(mode === "demo") },
      createdAt: stamp,
      updatedAt: stamp,
    };
    setEditor({
      title: existing ? "Өтінімді өзгерту" : "Жаңа өтінім",
      value: { ...value },
      fields: [
        f("id", "Өтінім идентификаторы", "text", true),
        f("organization", "Мемлекеттік орган", "text", true),
        f("title", "Тауар немесе қызмет атауы", "text", true),
        f("category", "Сатып алу санаты", "text", true),
        f("plannedQuantity", "Жоспарланған саны", "number"),
        f("unit", "Өлшем бірлігі", "text", true),
        f("unitPrice", "Бірлік бағасы, ₸", "number"),
        f(
          "requiredQuantity",
          "Қажетті жұмыс орындары / алушылар саны",
          "number",
        ),
        f("horizon", "Пайдалану және талдау мерзімі, жыл", "number", true),
        f("requiredOutcome", "Қажетті қызметтік нәтиже", "textarea", true),
        f("justification", "Негіздемелік құжат / құжатқа сілтеме"),
        ...evFields(mode),
      ],
      submit: async (v) => {
        if (existing && v.id !== existing.id)
          throw new Error("Өтінім идентификаторын өзгертуге болмайды");
        if (!existing && data.requests.some((r) => r.id === v.id))
          throw new Error("Бұл идентификатор бар");
        await saveRequest({ ...v, updatedAt: now() } as Request);
      },
    });
  }
  function editAsset(existing?: Asset) {
    if (!request) return;
    const value = existing || {
      id: id(),
      category: request.category,
      total: null,
      inUse: null,
      free: null,
      repairable: null,
      unusable: null,
      suitable: null,
      available: null,
      inspectedAt: "",
      inspector: "",
      evidence: emptyEvidence(mode === "demo"),
    };
    const tri: [string, string][] = [
      ["", "Белгісіз"],
      ["true", "Иә"],
      ["false", "Жоқ"],
    ];
    setEditor({
      title: "Активтерді тіркеу",
      value: {
        ...value,
        suitable: value.suitable === null ? "" : String(value.suitable),
        available: value.available === null ? "" : String(value.available),
      },
      fields: [
        f("category", "Актив санаты", "text", true),
        f("total", "Жалпы саны", "number"),
        f("inUse", "Қолданылып жатқан саны", "number"),
        f("free", "Жарамды бос активтер", "number"),
        f("repairable", "Жөндеуге жарамды", "number"),
        f("unusable", "Жарамсыз", "number"),
        { ...f("suitable", "Функционалдық сәйкестік", "select"), options: tri },
        {
          ...f("available", "Талдау мерзімінде нақты қолжетімді", "select"),
          options: tri,
        },
        f("inspectedAt", "Тексеру күні", "date"),
        f("inspector", "Тексеруші (қызметтік рөлі)"),
        ...evFields(mode),
      ],
      submit: async (v) => {
        const a = {
          ...v,
          suitable: v.suitable === "" ? null : v.suitable === "true",
          available: v.available === "" ? null : v.available === "true",
        } as Asset;
        await saveRequest({
          ...request,
          updatedAt: now(),
          assets: existing
            ? request.assets.map((x) => (x.id === a.id ? a : x))
            : [...request.assets, a],
        });
      },
    });
  }
  function editAlternative(existing?: Alternative) {
    if (!request) return;
    const value = existing || {
      id: id(),
      name: "",
      kind: "A",
      initial: null,
      installation: null,
      repair: null,
      annualMaintenance: null,
      annualOperation: null,
      replacement: null,
      other: null,
      lifetime: request.horizon,
      compliant: null,
      evidence: emptyEvidence(mode === "demo"),
    };
    setEditor({
      title: "Баламаны енгізу",
      value: {
        ...value,
        compliant: value.compliant === null ? "" : String(value.compliant),
      },
      fields: [
        f("name", "Балама атауы", "text", true),
        {
          ...f("kind", "Нұсқа", "select"),
          options: [
            ["A", "A · Толық жаңа сатып алу"],
            ["B", "B · Қолданыстағы активтер"],
            ["C", "C · Жөндеу және ішінара сатып алу"],
            ["D", "D · Жалға алу / қызмет алу"],
            ["E", "E · Басқа негізделген нұсқа"],
          ],
        },
        ...(
          [
            ["initial", "Бастапқы сатып алу құны"],
            ["installation", "Орнату құны"],
            ["repair", "Жөндеу құны (барлық мерзімге)"],
            ["annualMaintenance", "Жылдық қызмет көрсету шығыны"],
            ["annualOperation", "Жылдық энергия / пайдалану шығыны"],
            ["replacement", "Ауыстыру шығыны (барлық мерзімге)"],
            ["other", "Өзге шығындар (барлық мерзімге)"],
          ] as const
        ).map(([k, l]) => f(k, l + ", ₸", "number")),
        f("lifetime", "Қамтамасыз етілетін қызмет мерзімі, жыл", "number"),
        {
          ...f("compliant", "Бірдей қызметтік нәтижеге сәйкес пе?", "select"),
          options: [
            ["", "Белгісіз"],
            ["true", "Иә, расталған"],
            ["false", "Жоқ"],
          ],
        },
        ...evFields(mode),
      ],
      submit: async (v) => {
        const a = {
          ...v,
          compliant: v.compliant === "" ? null : v.compliant === "true",
        } as Alternative;
        await saveRequest({
          ...request,
          updatedAt: now(),
          alternatives: existing
            ? request.alternatives.map((x) => (x.id === a.id ? a : x))
            : [...request.alternatives, a],
        });
      },
    });
  }
  function financeEditor() {
    if (!request) return;
    const options: [string, string][] = [
      ["", "Таңдалмаған"],
      ...request.alternatives.map((a) => [a.id, a.name] as [string, string]),
    ];
    setEditor({
      title: "Қаржылық салыстыру және растау",
      value: { ...request.finance },
      fields: [
        {
          ...f("baselineId", "Салыстырылатын бастапқы нұсқа", "select"),
          options,
        },
        { ...f("selectedId", "Қолмен таңдалған балама", "select"), options },
        f("baselineDocument", "Бастапқы салыстырмалы құжат"),
        f("approvedChange", "Бекітілген өзгеріс құжаты"),
        f("actualResult", "Нақты қаржылық нәтиже құжаты"),
        f(
          "outcomePreserved",
          "Қызмет нәтижесінің сақталғаны расталды",
          "checkbox",
        ),
        f(
          "commitmentReduction",
          "Расталған қаржылық міндеттеменің азаюы, ₸",
          "number",
        ),
        f("confirmedSaving", "Бюджеттен расталған нақты үнем, ₸", "number"),
        f("reducedQuantity", "Расталған қысқартылған көлем, дана", "number"),
        ...evFields(mode),
      ],
      submit: async (v) =>
        saveRequest({
          ...request,
          finance: v as Request["finance"],
          updatedAt: now(),
        }),
    });
  }
  function addRecord(kind: "decisions" | "trials" | "reviews" | "iterations") {
    const choices: [string, string][] = [
      ["", "Байланыстырылмаған"],
      ...data.requests.map(
        (r) => [r.id, `${r.id} · ${r.title}`] as [string, string],
      ),
    ];
    const reqField: Field = {
      ...f("requestId", "Өтінім", "select", kind !== "trials"),
      options: choices,
    };
    const specs = {
      decisions: {
        title: "Шешім тіркеу",
        value: {
          id: id(),
          requestId: selected,
          issue: "",
          evidence: "",
          proposal: "",
          role: "",
          date: today(),
          status: "accepted",
          reason: "",
          createdAt: now(),
        },
        fields: [
          reqField,
          f("issue", "Анықталған мәселе", "textarea", true),
          f("evidence", "Дәлел", "textarea", true),
          f("proposal", "Ұсынылған шешім", "textarea", true),
          f("role", "Шешім қабылдаушының рөлі", "text", true),
          f("date", "Шешім күні", "date", true),
          {
            ...f("status", "Мәртебе", "select"),
            options: [
              ["accepted", "Қабылданды"],
              ["rejected", "Қабылданбады"],
            ] as [string, string][],
          },
          f("reason", "Негіздеме", "textarea", true),
        ],
      },
      trials: {
        title: "Ресми дерекпен сынақ",
        value: {
          id: id(),
          type: "lot",
          officialId: "",
          title: "",
          url: "",
          date: today(),
          plannedQuantity: null,
          unitPrice: null,
          requestId: "",
          notes: "",
        },
        fields: [
          {
            ...f("type", "Ресми материал түрі", "select"),
            options: [
              ["lot", "Мемлекеттік сатып алу лоты"],
              ["program", "Бюджеттік бағдарлама"],
              ["protocol", "Бюджеттік комиссия хаттамасы"],
            ] as [string, string][],
          },
          f("officialId", "Ресми идентификатор", "text", true),
          f("title", "Атауы", "text", true),
          f("url", "Ресми дереккөз URL", "text", true),
          f("date", "Дерек күні", "date", true),
          f("plannedQuantity", "Саны", "number"),
          f("unitPrice", "Бірлік бағасы, ₸", "number"),
          reqField,
          f("notes", "Ескерту / дерек шектеулері", "textarea"),
        ],
      },
      reviews: {
        title: "Сарапшының сыни бағалауы",
        value: {
          id: id(),
          requestId: selected,
          correct: "",
          falseAlarm: "",
          missed: "",
          missing: "",
          expert: "",
          createdAt: now(),
        },
        fields: [
          reqField,
          f("correct", "Дұрыс анықталған белгілер", "textarea"),
          f("falseAlarm", "Жалған дабылдар", "textarea"),
          f("missed", "Өткізіп алған жағдайлар", "textarea"),
          f("missing", "Дерек жетіспеушілігі", "textarea"),
          f("expert", "Сарапшының қорытындысы", "textarea", true),
        ],
      },
      iterations: {
        title: "Нақты ЖИ итерациясы",
        value: {
          id: id(),
          prompt: "",
          decision: "",
          checks: "",
          changes: "",
          createdAt: now(),
        },
        fields: [
          f("prompt", "Нақты енгізілген промпт", "textarea", true),
          f("decision", "Қабылданған шешім", "textarea", true),
          f("checks", "Орындалған тексерулер", "textarea", true),
          f("changes", "Нақты өзгерістер", "textarea", true),
        ],
      },
    };
    const spec = specs[kind];
    setEditor({
      title: spec.title,
      value: { ...spec.value },
      fields: spec.fields,
      submit: async (v) => {
        await persist({ ...data, [kind]: [...data[kind], v] });
      },
    });
  }
  async function importFile(file: File, kind: "requests" | "trials") {
    const form = new FormData();
    form.set("file", file);
    const res = await fetch(`/api/files?mode=${mode}&kind=${kind}`, {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setPreview({ kind, rows: json.rows });
  }
  function exportLink(kind: string, format = "csv", template = false) {
    return `/api/files?mode=${mode}&kind=${kind}&format=${format}&template=${template}`;
  }
  function fileControls(kind: "requests" | "trials") {
    return (
      <div className="toolbar">
        <label className="button secondary file">
          <Plus size={16} /> CSV/XLSX импорт
          <input
            type="file"
            accept=".csv,.xlsx"
            disabled={loading || saving}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) run(() => importFile(file, kind));
              e.target.value = "";
            }}
          />
        </label>
        <a className="text-link" href={exportLink(kind, "csv", true)}>
          CSV үлгісі
        </a>
        <a className="text-link" href={exportLink(kind, "xlsx", true)}>
          XLSX үлгісі
        </a>
        <div className="spacer" />
        <a className="button secondary" href={exportLink(kind)}>
          <Download size={16} /> CSV
        </a>
        <a className="button secondary" href={exportLink(kind, "xlsx")}>
          <Download size={16} /> XLSX
        </a>
      </div>
    );
  }
  function requestPicker() {
    return (
      <div className="picker">
        <label>
          Талдауға арналған өтінім
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Өтінімді таңдаңыз</option>
            {data.requests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.title}
              </option>
            ))}
          </select>
        </label>
        {request && (
          <span className="muted">
            {request.organization} <ChevronRight size={14} /> {request.horizon}{" "}
            жылдық талдау
          </span>
        )}
      </div>
    );
  }
  function report() {
    const blob = new Blob([buildReport(data, mode)], {
      type: "text/html;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qarjy-${mode}-report.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <div className="shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a className="brand" href="#" onClick={() => navigate("dashboard")}>
          <div className="brand-icon">
            <ShieldCheck size={25} />
          </div>
          <div>
            QARJY<span>CONTROL</span>
          </div>
        </a>
        <div className="workspace-label">
          САТЫП АЛУДЫ ЖОСПАРЛАУ <span>1.0</span>
        </div>
        <div className="module">
          <span className="live-dot" /> Value Gate <span>MVP</span>
        </div>
        <div className="nav-label">ЖҰМЫС КЕҢІСТІГІ</div>
        <nav>
          {NAV.map(([key, label, Icon]) => (
            <button
              key={key}
              aria-label={label}
              className={page === key ? "active" : ""}
              onClick={() => navigate(key)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === "requests" && <small>{data.requests.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            Дәлелге негізделген шешім<small>Жергілікті сақтау · SQLite</small>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          aria-label="Мәзірді жабу"
          className="scrim"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Мәзір"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Жұмыс кеңістігі <ChevronRight size={14} /> <strong>{nav[1]}</strong>
          </div>
          <div className="top-right">
            <span className="local">
              <span className="live-dot" /> Жергілікті режим
            </span>
            <div className="avatar">QC</div>
          </div>
        </header>
        <main>
          <div className="title-row">
            <div>
              <div className="eyebrow">
                VALUE GATE <span>/</span> ҚАЖЕТТІЛІКТІ НЕГІЗДЕУ
              </div>
              <h1>{nav[1]}</h1>
              <p className="subtitle">
                {page === "dashboard"
                  ? "Мемлекеттік сатып алуды жоспарлау. Әр шығынның артында — дәлелденген қажеттілік."
                  : "Салыстырыңыз, дәлелді тексеріңіз және негізделген шешімді тіркеңіз."}
              </p>
            </div>
            <div className="title-actions">
              <div className="mode-switch">
                <button
                  disabled={saving}
                  className={mode === "real" ? "chosen" : ""}
                  onClick={() => changeMode("real")}
                >
                  Нақты дерек
                </button>
                <button
                  disabled={saving}
                  className={mode === "demo" ? "chosen" : ""}
                  onClick={() => changeMode("demo")}
                >
                  DEMO
                </button>
              </div>
              {page === "dashboard" || page === "requests" ? (
                <button
                  disabled={loading || saving}
                  className="button primary"
                  onClick={() => editRequest()}
                >
                  <Plus size={17} /> Жаңа өтінім
                </button>
              ) : null}
            </div>
          </div>
          {mode === "demo" && (
            <div className="demo-banner">
              <FlaskConical size={19} />
              <div>
                <strong>DEMO режимі · Шартты дерек</strong>
                <span>
                  Оқу мысалдары нақты өтінімдер мен көрсеткіштерден бөлек
                  сақталады.
                </span>
              </div>
              <button
                className="button secondary"
                disabled={saving || loading}
                onClick={() => {
                  if (
                    !data.requests.length ||
                    confirm(
                      "DEMO деректері оқу мысалымен ауыстырылады. Жалғастыру керек пе?",
                    )
                  )
                    run(() => persist(demoDataset()));
                }}
              >
                Мысалды {data.requests.length ? "қайта жүктеу" : "жүктеу"}
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="error">
              {error}{" "}
              <button className="text-link" onClick={() => run(reload)}>
                Қайта жүктеу
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="success">
              <Check size={16} />
              {notice}
              <button
                aria-label="Хабарламаны жабу"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="panel empty">
              <RefreshCw />
              Деректер жүктелуде…
            </div>
          ) : (
            <>
              {page === "dashboard" && (
                <>
                  <div className="purpose">
                    <div className="purpose-icon">
                      <ShieldCheck size={25} />
                    </div>
                    <div>
                      <strong>Қажеттілік бар ма? Тиімді балама қандай?</strong>
                      <p>
                        Қолда бар активтерді, қызметтік нәтижені және
                        салыстырмалы шығындарды бір жерде тексеріңіз.
                      </p>
                    </div>
                    <span className="pill">Бір кезең · Бір тәуекел</span>
                  </div>
                  <div className="stats-grid">
                    <Metric
                      label="Негізгі KRI"
                      value={
                        stats.kri === null ? "—" : stats.kri.toFixed(1) + "%"
                      }
                      sub={`${stats.complete} толық тексерілген өтінім`}
                      icon={<Activity />}
                    />
                    <Metric
                      label="Толық тексерілген"
                      value={String(stats.complete)}
                      sub={`${stats.total} өтінімнің ішінен`}
                      icon={<ShieldCheck />}
                    />
                    <Metric
                      label="Ықтимал шығын айырмасы"
                      value={money(stats.potential)}
                      sub="Расталған нақты үнем емес"
                      icon={<ChartNoAxesCombined />}
                    />
                    <Metric
                      label="Дерегі жеткіліксіз"
                      value={String(stats.incomplete)}
                      sub="Негізгі KRI бөлгішіне кірмейді"
                      icon={<TriangleAlert />}
                    />
                  </div>
                  <div className="dashboard-grid">
                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>Өтінімдерді тексеру</h2>
                          <p>Негізгі тәуекел бойынша ағымдағы жағдай</p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => navigate("requests")}
                        >
                          Барлық өтінім <ArrowUpRight size={15} />
                        </button>
                      </div>
                      <div className="pipeline">
                        <div>
                          <span className="num">01</span>
                          <strong>Қажеттілік</strong>
                          <small>Қызметтік нәтиже</small>
                        </div>
                        <ChevronRight />
                        <div>
                          <span className="num">02</span>
                          <strong>Активтер</strong>
                          <small>Қолжетімді ресурстар</small>
                        </div>
                        <ChevronRight />
                        <div>
                          <span className="num">03</span>
                          <strong>Баламалар</strong>
                          <small>Бірдей мерзімдегі TCO</small>
                        </div>
                        <ChevronRight />
                        <div>
                          <span className="num">04</span>
                          <strong>Шешім</strong>
                          <small>Дәлел және негіздеме</small>
                        </div>
                      </div>
                      {data.requests.length ? (
                        <RequestTable
                          rows={data.requests.slice(-5).reverse()}
                          onSelect={(r) => {
                            setSelected(r.id);
                            navigate("need");
                          }}
                        />
                      ) : (
                        <Empty
                          text="Алғашқы өтінімді тексеруден бастаңыз"
                          detail="Қажеттілікті енгізіңіз, активтерді тексеріңіз, содан кейін баламаларды салыстырыңыз."
                        />
                      )}
                    </section>
                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>Дерек толықтығы</h2>
                          <p>Талдаудың сенімділігі</p>
                        </div>
                        <span className="small-icon">
                          <FileChartColumn size={19} />
                        </span>
                      </div>
                      <div
                        className="donut"
                        style={{
                          background: stats.total
                            ? `conic-gradient(#168b83 ${(stats.complete / stats.total) * 100}%, #e7edf2 0)`
                            : "#e7edf2",
                        }}
                      >
                        <div>
                          <strong>{stats.total}</strong>
                          <span>өтінім</span>
                        </div>
                      </div>
                      <div className="legend">
                        <span>
                          <i className="teal" />
                          Толық тексерілген <b>{stats.complete}</b>
                        </span>
                        <span>
                          <i />
                          Дерек жеткіліксіз <b>{stats.incomplete}</b>
                        </span>
                      </div>
                      <div className="note">
                        Толық емес дерекпен шынайы үнем есептелмейді.
                      </div>
                    </section>
                  </div>
                  <div className="dashboard-grid bottom">
                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>Соңғы шешімдер</h2>
                          <p>Ішкі бақылау журналы</p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => navigate("decisions")}
                        >
                          Журналға өту <ArrowUpRight size={15} />
                        </button>
                      </div>
                      {data.decisions.length ? (
                        data.decisions
                          .slice(-3)
                          .reverse()
                          .map((d) => (
                            <div className="list-row" key={d.id}>
                              <span className="small-icon">
                                <BookOpen size={18} />
                              </span>
                              <div>
                                <strong>{d.requestId}</strong>
                                <p>{d.proposal}</p>
                              </div>
                              <span className="badge gray">
                                {d.status === "accepted"
                                  ? "Қабылданды"
                                  : "Қабылданбады"}
                              </span>
                            </div>
                          ))
                      ) : (
                        <Empty
                          text="Шешімдер әлі тіркелмеді"
                          detail="Тексеру аяқталған соң шешім мен оның дәлелін тіркеңіз."
                        />
                      )}
                    </section>
                    <section className="panel guide">
                      <span className="eyebrow">ТЕКСЕРУ ҚАҒИДАТЫ</span>
                      <h2>Сандардан бұрын — дәлел.</h2>
                      <p>
                        Белгісіз мән нөлге тең емес. Ең арзан балама қызметтік
                        нәтижеге сәйкес болғанда ғана салыстырылады.
                      </p>
                      <button
                        className="text-link"
                        onClick={() => navigate("method")}
                      >
                        Әдістемені оқу <ArrowUpRight size={16} />
                      </button>
                    </section>
                  </div>
                </>
              )}
              {page === "workloads" && (
                <Workloads
                  data={data}
                  mode={mode}
                  saving={saving}
                  persist={persist}
                />
              )}
              {page === "requests" && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>
                      Өтінімдер тізілімі{" "}
                      <span className="count">{data.requests.length}</span>
                    </h2>
                    <label className="search">
                      <Search size={16} />
                      <input
                        aria-label="Өтінім іздеу"
                        placeholder="Атауы немесе ID бойынша іздеу"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  {fileControls("requests")}
                  <RequestTable
                    rows={data.requests.filter((r) =>
                      `${r.id} ${r.title} ${r.organization}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )}
                    onSelect={(r) => {
                      setSelected(r.id);
                      navigate("need");
                    }}
                    onEdit={editRequest}
                    onDelete={(r) => {
                      if (
                        confirm(
                          `${r.id} өтінімі мен байланысты журнал жазбаларын жою керек пе? Өзгеріс тарихта сақталады.`,
                        )
                      )
                        run(() =>
                          persist({
                            ...data,
                            requests: data.requests.filter(
                              (x) => x.id !== r.id,
                            ),
                            decisions: data.decisions.filter(
                              (x) => x.requestId !== r.id,
                            ),
                            reviews: data.reviews.filter(
                              (x) => x.requestId !== r.id,
                            ),
                            trials: data.trials.map((x) =>
                              x.requestId === r.id
                                ? { ...x, requestId: "" }
                                : x,
                            ),
                          }),
                        );
                    }}
                  />
                </section>
              )}
              {["need", "assets", "alternatives", "finance", "risks"].includes(
                page,
              ) && (
                <>
                  {requestPicker()}
                  {!request ? (
                    <section className="panel">
                      <Empty text="Талдау үшін өтінім таңдаңыз" />
                    </section>
                  ) : (
                    <>
                      {page === "need" && analysis && (
                        <>
                          <div className="stats-grid">
                            <Metric
                              label="Жоспарланған көлем"
                              value={String(
                                request.plannedQuantity ?? "Белгісіз",
                              )}
                              sub={request.unit}
                            />
                            <Metric
                              label="Қажетті саны"
                              value={String(
                                request.requiredQuantity ?? "Белгісіз",
                              )}
                              sub="Қызметтік нәтиже үшін"
                            />
                            <Metric
                              label="Жарамды бос активтер"
                              value={String(analysis.available ?? "Белгісіз")}
                              sub="Сәйкес және қолжетімді"
                            />
                            <Metric
                              label="Негізделген жаңа саны"
                              value={String(analysis.justified ?? "Белгісіз")}
                              sub="MAX(0, қажеттілік − активтер)"
                            />
                          </div>
                          <section className="panel padded">
                            <div className="panel-head flush">
                              <h2>{request.title}</h2>
                              {badge(analysis.status)}
                            </div>
                            <p>
                              <strong>Қажетті нәтиже:</strong>{" "}
                              {request.requiredOutcome}
                            </p>
                            <p>
                              <strong>Ықтимал артық көлем:</strong>{" "}
                              {analysis.excess ?? "Белгісіз"} {request.unit}
                            </p>
                            {analysis.reasons.map((r, i) => (
                              <div className="warning" key={i}>
                                {r}
                              </div>
                            ))}
                            <label className="checkbox inline">
                              <input
                                type="checkbox"
                                checked={request.inventoryConfirmed}
                                disabled={saving}
                                onChange={(e) =>
                                  run(() =>
                                    saveRequest({
                                      ...request,
                                      inventoryConfirmed: e.target.checked,
                                      updatedAt: now(),
                                    }),
                                  )
                                }
                              />
                              Осы санаттағы активтер толық түгенделді; бос тізім
                              болса, активтердің жоқтығын растаймын.
                            </label>
                            <div className="toolbar">
                              <button
                                className="button secondary"
                                onClick={() => editRequest(request)}
                              >
                                Өтінімді өзгерту
                              </button>
                              <button
                                className="button primary"
                                onClick={() => navigate("assets")}
                              >
                                Активтерді тексеру <ChevronRight size={16} />
                              </button>
                            </div>
                            <p className="muted">
                              Тек жарамды, бос, функционалдық сәйкес және талдау
                              мерзімінде қолжетімді активтер есепке алынады.
                              Қолданыстағы активтер бұл модельде жаңа
                              қажеттілікті өтемейді; қажетті санды қосымша
                              қамтамасыз етілетін орындар ретінде енгізіңіз.
                            </p>
                          </section>
                        </>
                      )}
                      {page === "assets" && (
                        <section className="panel">
                          <div className="panel-head">
                            <div>
                              <h2>Қолданыстағы активтер</h2>
                              <p>
                                Санаттар қосындысы жалпы санға тең болуы тиіс
                              </p>
                            </div>
                            <button
                              className="button primary"
                              onClick={() => editAsset()}
                            >
                              <Plus size={16} /> Актив енгізу
                            </button>
                          </div>
                          {request.assets.length ? (
                            <div className="table-wrap">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Санат</th>
                                    <th>Жалпы</th>
                                    <th>Қолданыста</th>
                                    <th>Бос</th>
                                    <th>Жөндеу</th>
                                    <th>Жарамсыз</th>
                                    <th>Сәйкес / қолжетімді</th>
                                    <th>Әрекет</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {request.assets.map((a) => (
                                    <tr key={a.id}>
                                      <td>
                                        <strong>{a.category}</strong>
                                        <small>
                                          {a.inspectedAt ||
                                            "Тексеру күні белгісіз"}
                                        </small>
                                      </td>
                                      <td>{a.total ?? "—"}</td>
                                      <td>{a.inUse ?? "—"}</td>
                                      <td>{a.free ?? "—"}</td>
                                      <td>{a.repairable ?? "—"}</td>
                                      <td>{a.unusable ?? "—"}</td>
                                      <td>
                                        {a.suitable === null
                                          ? "?"
                                          : a.suitable
                                            ? "Иә"
                                            : "Жоқ"}{" "}
                                        /{" "}
                                        {a.available === null
                                          ? "?"
                                          : a.available
                                            ? "Иә"
                                            : "Жоқ"}
                                      </td>
                                      <td>
                                        <button
                                          className="text-link"
                                          onClick={() => editAsset(a)}
                                        >
                                          Өзгерту
                                        </button>
                                        <button
                                          className="text-link danger"
                                          onClick={() => {
                                            if (
                                              confirm("Активті жою керек пе?")
                                            )
                                              run(() =>
                                                saveRequest({
                                                  ...request,
                                                  assets: request.assets.filter(
                                                    (x) => x.id !== a.id,
                                                  ),
                                                  updatedAt: now(),
                                                }),
                                              );
                                          }}
                                        >
                                          Жою
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <Empty />
                          )}
                          <div className="padded muted">
                            Құжаттың расталуы, тексеруші және қолжетімділік
                            белгісіз болса, қажеттілік қорытындысы шығарылмайды.
                          </div>
                        </section>
                      )}
                      {page === "alternatives" && (
                        <>
                          <section className="panel">
                            <div className="panel-head">
                              <div>
                                <h2>Бірдей нәтиже · {request.horizon} жыл</h2>
                                <p>
                                  TCO дисконтсыз есептеледі. Балама автоматты
                                  түрде таңдалмайды.
                                </p>
                              </div>
                              <button
                                className="button primary"
                                onClick={() => editAlternative()}
                              >
                                <Plus size={16} /> Балама қосу
                              </button>
                            </div>
                            {request.alternatives.length ? (
                              <>
                                <div className="table-wrap">
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Балама</th>
                                        <th>Қызметке сәйкестік</th>
                                        <th>Дәлел</th>
                                        <th>TCO / {request.horizon} жыл</th>
                                        <th>Әрекет</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {request.alternatives.map((a) => (
                                        <tr key={a.id}>
                                          <td>
                                            <strong>
                                              {a.kind} · {a.name}
                                            </strong>
                                            <small>
                                              {a.lifetime ?? "—"} жыл
                                            </small>
                                          </td>
                                          <td>
                                            {a.compliant === null
                                              ? "Белгісіз"
                                              : a.compliant
                                                ? "Сәйкес"
                                                : "Сәйкес емес"}
                                          </td>
                                          <td>
                                            {a.evidence.verified
                                              ? "Тексерілген"
                                              : "Тексерілмеген"}
                                          </td>
                                          <td>
                                            {money(tco(a, request.horizon))}
                                          </td>
                                          <td>
                                            <button
                                              className="text-link"
                                              onClick={() => editAlternative(a)}
                                            >
                                              Өзгерту
                                            </button>
                                            <button
                                              className="text-link danger"
                                              onClick={() => {
                                                if (
                                                  confirm(
                                                    "Баламаны жою керек пе?",
                                                  )
                                                )
                                                  run(() =>
                                                    saveRequest({
                                                      ...request,
                                                      alternatives:
                                                        request.alternatives.filter(
                                                          (x) => x.id !== a.id,
                                                        ),
                                                      finance: {
                                                        ...request.finance,
                                                        baselineId:
                                                          request.finance
                                                            .baselineId === a.id
                                                            ? ""
                                                            : request.finance
                                                                .baselineId,
                                                        selectedId:
                                                          request.finance
                                                            .selectedId === a.id
                                                            ? ""
                                                            : request.finance
                                                                .selectedId,
                                                      },
                                                      updatedAt: now(),
                                                    }),
                                                  );
                                              }}
                                            >
                                              Жою
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="chart">
                                  <ResponsiveContainer
                                    width="100%"
                                    height={240}
                                  >
                                    <BarChart
                                      data={request.alternatives
                                        .filter(
                                          (a) =>
                                            tco(a, request.horizon) !== null,
                                        )
                                        .map((a) => ({
                                          name: a.name,
                                          TCO: tco(a, request.horizon),
                                        }))}
                                      margin={{ left: 25, right: 20 }}
                                    >
                                      <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                      />
                                      <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11 }}
                                      />
                                      <YAxis
                                        tickFormatter={(v) =>
                                          `${Number(v) / 1000000} млн`
                                        }
                                      />
                                      <Tooltip
                                        formatter={(v) => money(Number(v))}
                                      />
                                      <Bar
                                        dataKey="TCO"
                                        fill="#178b83"
                                        radius={[5, 5, 0, 0]}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </>
                            ) : (
                              <Empty />
                            )}
                            <div className="padded">
                              <p className="muted">
                                Диаграмма — шығын көрінісі, ұсыныс емес. Сәйкес
                                емес немесе дәлелі расталмаған балама қаржылық
                                тиімділікке ұсынылмайды.
                              </p>
                              <button
                                className="button secondary"
                                onClick={financeEditor}
                              >
                                Бастапқы және таңдалған нұсқаны белгілеу
                              </button>
                            </div>
                          </section>
                        </>
                      )}
                      {page === "finance" && analysis && (
                        <>
                          <div className="stats-grid three">
                            <Metric
                              label="Ықтимал шығын айырмасы"
                              value={money(analysis.potentialDifference)}
                              sub="Есептік мүмкіндік, нақты үнем емес"
                            />
                            <Metric
                              label="Міндеттеменің нақты азаюы"
                              value={money(analysis.commitmentReduction)}
                              sub="Бекітілген өзгеріске сүйенеді"
                            />
                            <Metric
                              label="Бюджеттен расталған үнем"
                              value={money(analysis.confirmedSaving)}
                              sub={
                                analysis.confirmedSaving === null
                                  ? "Нақты үнем расталмаған"
                                  : "Пайдаланушы құжатпен растаған"
                              }
                            />
                          </div>
                          <section className="panel padded">
                            <h2>Салыстырмалы шығын және дәлел</h2>
                            <p>
                              Бастапқы TCO:{" "}
                              <strong>{money(analysis.baselineCost)}</strong> ·
                              Таңдалған TCO:{" "}
                              <strong>{money(analysis.selectedCost)}</strong>
                            </p>
                            <p className="formula">
                              MAX(0, BaselineComparableCost −
                              SelectedComparableCost)
                            </p>
                            <p>
                              Таңдалған нұсқа, бірдей нәтиже, толық шығындар
                              және расталған дереккөз қажет. Нақты үнем үшін
                              бастапқы құжат, бекітілген өзгеріс, қаржылық
                              нәтиже және қызметтің сақталуы тіркеледі.
                            </p>
                            <button
                              className="button primary"
                              onClick={financeEditor}
                            >
                              Нұсқалар мен растауды енгізу
                            </button>
                          </section>
                        </>
                      )}
                      {page === "risks" && analysis && (
                        <section className="panel padded">
                          <div className="panel-head flush">
                            <h2>Артық көлемді жоспарлау тәуекелі</h2>
                            {badge(analysis.status)}
                          </div>
                          <p>
                            Себеп: жарамды активтер мен қызметтік қажеттіліктің
                            жеткіліксіз тексерілуі. Салдар: артық шығын және
                            пайдаланылмайтын активтер.
                          </p>
                          {[...analysis.reasons, ...analysis.flags].length ? (
                            [...analysis.reasons, ...analysis.flags].map(
                              (x, i) => (
                                <div className="risk-row" key={i}>
                                  <TriangleAlert size={19} />
                                  {x}
                                </div>
                              ),
                            )
                          ) : (
                            <div className="success">
                              Тіркелген деректер бойынша қосымша белгі
                              анықталмады.
                            </div>
                          )}
                          <div className="note">
                            Тәуекел балы қолданылмайды. Мәртебе дәлел
                            жеткіліктілігі мен ашық ережелерге негізделеді.
                          </div>
                          <button
                            className="button primary"
                            onClick={() => addRecord("decisions")}
                          >
                            Шешім тіркеу
                          </button>
                        </section>
                      )}
                    </>
                  )}
                </>
              )}
              {page === "trials" && (
                <>
                  <section className="panel">
                    <div className="panel-head">
                      <div>
                        <h2>Ресми материалдарды сынау</h2>
                        <p>
                          {data.trials.filter((t) => t.type === "lot").length}{" "}
                          лот ·{" "}
                          {
                            data.trials.filter((t) => t.type === "program")
                              .length
                          }{" "}
                          бағдарлама ·{" "}
                          {
                            data.trials.filter((t) => t.type === "protocol")
                              .length
                          }{" "}
                          хаттама
                        </p>
                      </div>
                      <button
                        className="button primary"
                        onClick={() => addRecord("trials")}
                      >
                        <Plus size={16} /> Жазба қосу
                      </button>
                    </div>
                    <div className="padded">
                      <div className="note">
                        10 лоттың болуы 10 толық талдау жасалды дегенді
                        білдірмейді. Ресми API интеграциясы қосылмаған.
                        Импортталған URL мен ресми мәртебені пайдаланушы
                        тексереді.
                      </div>
                    </div>
                    {fileControls("trials")}
                    {data.trials.length ? (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Ресми ID / атауы</th>
                              <th>Дереккөз / күні</th>
                              <th>Көрсеткіштер</th>
                              <th>Нәтиже / толықтығы</th>
                              <th>Ескерту</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.trials.map((t) => {
                              const linked = data.requests.find(
                                (r) => r.id === t.requestId,
                              );
                              const result = linked ? analyze(linked) : null;
                              return (
                                <tr key={t.id}>
                                  <td>
                                    <strong>{t.officialId}</strong>
                                    <small>{t.title}</small>
                                  </td>
                                  <td>
                                    <a
                                      target="_blank"
                                      rel="noreferrer"
                                      href={t.url}
                                    >
                                      Ресми дереккөз ↗
                                    </a>
                                    <small>{t.date}</small>
                                  </td>
                                  <td>
                                    {t.plannedQuantity ?? "Белгісіз"} ×{" "}
                                    {money(t.unitPrice)}
                                  </td>
                                  <td>
                                    {result?.status || "Дерек жеткіліксіз"}
                                    {!result?.complete && (
                                      <small>
                                        Бұл лот бойынша негізгі тәуекелді
                                        тексеруге қажетті ішкі деректер жоқ
                                      </small>
                                    )}
                                  </td>
                                  <td>{t.notes || "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty
                        text="Нақты деректер енгізілмеді"
                        detail="Кемінде 10 нақты лотты немесе бір ресми бағдарлама / хаттаманы енгізіңіз. Ойдан шығарылған нәтижелер көрсетілмейді."
                      />
                    )}
                  </section>
                </>
              )}
              {page === "decisions" && (
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Шешім тарихы</h2>
                      <p>
                        Бұл — абсолютті қорғалған аудит емес, ішкі бақылау
                        журналы.
                      </p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => addRecord("decisions")}
                    >
                      <Plus size={16} /> Шешім тіркеу
                    </button>
                  </div>
                  {data.decisions.length ? (
                    data.decisions
                      .slice()
                      .reverse()
                      .map((d) => (
                        <article className="journal" key={d.id}>
                          <div className="journal-heading">
                            <strong>
                              {d.requestId} · {d.role}
                            </strong>
                            <span className="badge gray">
                              {d.status === "accepted"
                                ? "Қабылданды"
                                : "Қабылданбады"}
                            </span>
                            <time>{d.date}</time>
                          </div>
                          <dl>
                            <dt>Мәселе</dt>
                            <dd>{d.issue}</dd>
                            <dt>Дәлел</dt>
                            <dd>{d.evidence}</dd>
                            <dt>Ұсыныс</dt>
                            <dd>{d.proposal}</dd>
                            <dt>Негіздеме</dt>
                            <dd>{d.reason}</dd>
                          </dl>
                          <small className="muted">
                            Тіркелді:{" "}
                            {new Date(d.createdAt).toLocaleString("kk-KZ")}
                          </small>
                        </article>
                      ))
                  ) : (
                    <Empty />
                  )}
                  <div className="padded">
                    <h3>
                      <History size={17} /> Өзгерістердің уақыты
                    </h3>
                    {history.length ? (
                      <ul className="history">
                        {history.slice(0, 10).map((h) => (
                          <li key={h.id}>
                            Нұсқа {h.version}
                            <time>
                              {new Date(h.changed_at).toLocaleString("kk-KZ")}
                            </time>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">Өзгерістер тіркелмеді.</p>
                    )}
                  </div>
                </section>
              )}
              {page === "reports" && (
                <>
                  <div className="stats-grid three">
                    <Metric
                      label="Ықтимал артық көлем"
                      value={String(stats.excess ?? "Белгісіз")}
                      sub="Дерегі жеткілікті есептеулердің қосындысы"
                    />
                    <Metric
                      label="Расталған қысқартылған көлем"
                      value={String(stats.reduced ?? "Расталмаған")}
                      sub="Дәлелдері енгізілген көлем"
                    />
                    <Metric
                      label="Шешім қабылдау ұзақтығы"
                      value={
                        decisionDays(data) === null
                          ? "—"
                          : decisionDays(data)!.toFixed(1) + " күн"
                      }
                      sub="Өтінімнен тіркелген шешім күніне дейін"
                    />
                  </div>
                  <section className="panel padded">
                    <h2>Тапсыруға арналған материалдар</h2>
                    <p>
                      4 беттік түсініктеме жобасы: мақсат, әдістеме, нақты сынақ
                      нәтижелері және енгізу жоспары. HTML файлды браузерде
                      ашып, PDF ретінде басып шығаруға болады.
                    </p>
                    <div className="toolbar">
                      <button className="button primary" onClick={report}>
                        <Download size={17} /> Түсініктеме және енгізу жоспары
                      </button>
                      <a
                        className="button secondary"
                        href={exportLink("results")}
                      >
                        Сынақ нәтижелері · CSV
                      </a>
                      <a
                        className="button secondary"
                        href={exportLink("results", "xlsx")}
                      >
                        Нәтижелер · XLSX
                      </a>
                      <a
                        className="button secondary"
                        href={exportLink("trials")}
                      >
                        Ресми сынақ кестесі
                      </a>
                      <a
                        className="button secondary"
                        href={exportLink("iterations")}
                      >
                        ЖИ журналы · CSV
                      </a>
                    </div>
                    <h3>Есептің дерек негізі</h3>
                    <p>
                      {stats.total} өтінім; {stats.complete} толық тексерілген;{" "}
                      {stats.incomplete} дерегі жеткіліксіз. KRI:{" "}
                      {stats.kri === null
                        ? "есептелмейді"
                        : stats.kri.toFixed(1) + "%"}
                      .
                    </p>
                    <p className="muted">
                      Тек белгілі мәндер қосындыланады. Белгісіз мәндер жалпы
                      сомада қамтылмайды; әр өтінім нәтижесін жеке тексеріңіз.
                      Расталған үнем мемлекеттік жүйемен тәуелсіз тексерілмеген.
                    </p>
                  </section>
                </>
              )}
              {page === "method" && (
                <>
                  <section className="panel padded methodology">
                    <span className="eyebrow">ӘДІСТЕМЕ · 1.0 MVP</span>
                    <h2>Бір кезең. Бір негізгі тәуекел.</h2>
                    <p>
                      Кезең — сатып алуды жоспарлау және қажеттілікті негіздеу.
                      Тәуекел — қажеттілікті жеткіліксіз негіздеуден артық
                      көлемге қаражат жоспарлау.
                    </p>
                    <h3>Ашық есептеу ережелері</h3>
                    <div className="formula">
                      PlannedCost = PlannedQuantity × UnitPrice
                      <br />
                      JustifiedNewQuantity = MAX(0, RequiredQuantity −
                      AvailableSuitableQuantity)
                      <br />
                      PotentialExcessQuantity = MAX(0, PlannedQuantity −
                      JustifiedNewQuantity)
                      <br />
                      TCO = бастапқы + орнату + жөндеу + (жылдық қызмет + жылдық
                      пайдалану) × мерзім + ауыстыру + өзге
                      <br />
                      KRI = жеткіліксіз негізделген / толық тексерілген × 100%
                    </div>
                    <p>
                      Қажетті сан — қосымша қамтамасыз етілетін жұмыс орындары.
                      Бос активтер ғана шегеріледі. Жөндеуге жарамды актив
                      жөндеусіз жарамды актив болып саналмайды. Басқа санаттағы
                      активтер есепке кірмейді. Тізілімнің толықтығын
                      пайдаланушы растайды.
                    </p>
                    <p>
                      Баламалар бір қызметтік нәтиже мен бір мерзімді жабуы
                      тиіс. Қамтамасыз етілетін қызмет мерзімі талдау мерзімінен
                      қысқа болса, TCO салыстырылмайды. Ауыстыру мен өзге
                      шығындар — бүкіл мерзім үшін жиынтық; жалдау ақысы жылдық
                      пайдалану шығынына енгізіледі. Дисконт, инфляция және
                      қалдық құн қолданылмайды.
                    </p>
                    <p>
                      Толық тексеру үшін қажеттілік, түгендеу, расталған
                      дереккөз, бірлік бағасы және екі сәйкес баламаның
                      салыстырмалы шығыны қажет. Дерегі толық, бірақ қосымша
                      белгілері бар өтінімдер KRI алымына кіреді. Толық емес
                      деректер бөлгішке кірмейді; нөлдік бөлгіште KRI
                      шығарылмайды.
                    </p>
                    <h3>Құқықтық негіз</h3>
                    <p>
                      ҚР Бюджет кодексі, мемлекеттік сатып алу туралы заңнама
                      және жоспарлау тәртібі:{" "}
                      <a
                        href="https://adilet.zan.kz"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Әділет
                      </a>
                      ,{" "}
                      <a
                        href="https://goszakup.gov.kz"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Мемлекеттік сатып алу порталы
                      </a>
                      .{" "}
                      <strong>
                        Қолданыстағы редакциясы қайта тексерілуі қажет.
                      </strong>{" "}
                      Нақты баптар мен құжат күндері тексерілмегендіктен
                      келтірілмейді.
                    </p>
                    <h3>Халықаралық әдістемелік бағдарлар</h3>
                    <ul>
                      <li>
                        <a
                          href="https://www.oecd.org/en/topics/public-procurement.html"
                          target="_blank"
                          rel="noreferrer"
                        >
                          OECD · Public procurement
                        </a>{" "}
                        — тиімділік, есептілік және дәлелге негізделген
                        жоспарлау.
                      </li>
                      <li>
                        <a
                          href="https://www.worldbank.org/en/projects-operations/products-and-services/brief/procurement-new-framework"
                          target="_blank"
                          rel="noreferrer"
                        >
                          World Bank · Procurement Framework
                        </a>{" "}
                        — қызметтік мақсатқа сәйкестік және өмірлік цикл
                        шығындарын салыстыру.
                      </li>
                      <li>
                        <a
                          href="https://www.open-contracting.org"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Contracting Partnership
                        </a>{" "}
                        — дерек ашықтығы.
                      </li>
                      <li>
                        <a
                          href="https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government"
                          target="_blank"
                          rel="noreferrer"
                        >
                          HM Treasury · Green Book
                        </a>{" "}
                        — баламаларды бағалау бағыты.
                      </li>
                    </ul>
                    <p className="note">
                      Бұл — әдістемелік бағдарлар, тексерілген құқықтық
                      қорытынды емес. Сілтемелердің ағымдағы мазмұны мен нақты
                      басылымдары қайта тексерілуі қажет.
                    </p>
                    <h3>Университет тапсырмасы және енгізу</h3>
                    <p>
                      <strong>
                        Дәрістегі таңдалған құрал —{" "}
                        {data.settings.lectureTool || "нақтылау қажет"}
                      </strong>
                    </p>
                    <p>
                      Жауапты: {data.settings.owner || "тағайындалмаған"} ·
                      Жиілік: {data.settings.frequency || "нақтыланбаған"}
                    </p>
                    <p>
                      {data.settings.rollout ||
                        "Енгізу жоспарын толтырыңыз: пилот → сарапшы тексеруі → KRI мониторингі → қайта бағалау."}
                    </p>
                    <button
                      className="button primary"
                      onClick={() =>
                        setEditor({
                          title: "Әдістеме және енгізу жоспары",
                          value: { ...data.settings },
                          fields: [
                            f("lectureTool", "Дәрістегі нақты таңдалған құрал"),
                            f("owner", "Жауапты маманның қызметтік рөлі"),
                            f("frequency", "Тексеру жиілігі"),
                            f(
                              "rollout",
                              "Кезеңдер, мерзімдер және жауапкершілік",
                              "textarea",
                            ),
                          ],
                          submit: async (v) =>
                            persist({
                              ...data,
                              settings: v as Dataset["settings"],
                            }),
                        })
                      }
                    >
                      Әдістемені толықтыру
                    </button>
                  </section>
                </>
              )}
              {page === "review" && (
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Қателер мен жалған дабылдарды бағалау</h2>
                      <p>Алгоритм қорытындысын сарапшы тексереді</p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => addRecord("reviews")}
                    >
                      <Plus size={16} /> Бағалау қосу
                    </button>
                  </div>
                  {data.reviews.length ? (
                    data.reviews.map((r) => (
                      <article className="journal" key={r.id}>
                        <h3>{r.requestId}</h3>
                        <dl>
                          {[
                            ["Дұрыс белгілер", r.correct],
                            ["Жалған дабыл", r.falseAlarm],
                            ["Өткізіп алған жағдай", r.missed],
                            ["Дерек жетіспеушілігі", r.missing],
                            ["Сарапшы қорытындысы", r.expert],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <dt>{k}</dt>
                              <dd>{v || "Тіркелмеген"}</dd>
                            </div>
                          ))}
                        </dl>
                        <small>
                          {new Date(r.createdAt).toLocaleString("kk-KZ")}
                        </small>
                      </article>
                    ))
                  ) : (
                    <Empty
                      text="Сарапшы бағалауы енгізілмеді"
                      detail="Жалған дабылдар мен өткізіп алған жағдайларды нақты тексеруден кейін тіркеңіз."
                    />
                  )}
                </section>
              )}
              {page === "iterations" && (
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>
                        Нақты ЖИ итерациялары{" "}
                        <span className="count">
                          {data.iterations.length} / 3
                        </span>
                      </h2>
                      <p>
                        Бұрын болмаған диалогтарды қоспаңыз. Үлгі — толтырылатын
                        форма, нақты итерация емес.
                      </p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => addRecord("iterations")}
                    >
                      <Plus size={16} /> Нақты итерация енгізу
                    </button>
                  </div>
                  {data.iterations.length ? (
                    data.iterations.map((i, n) => (
                      <article className="journal" key={i.id}>
                        <h3>
                          Итерация {n + 1} ·{" "}
                          {new Date(i.createdAt).toLocaleString("kk-KZ")}
                        </h3>
                        <dl>
                          <dt>Промпт</dt>
                          <dd>{i.prompt}</dd>
                          <dt>Шешім</dt>
                          <dd>{i.decision}</dd>
                          <dt>Тексеру</dt>
                          <dd>{i.checks}</dd>
                          <dt>Өзгерістер</dt>
                          <dd>{i.changes}</dd>
                        </dl>
                      </article>
                    ))
                  ) : (
                    <Empty
                      text="Нақты итерациялар әлі тіркелмеді"
                      detail="Кемінде үш нақты промпт, шешім, тексеру және өзгеріс қажет. Журнал автоматты түрде ойдан толтырылмайды."
                    />
                  )}
                </section>
              )}
            </>
          )}
          <div className="legal-note">
            <ShieldCheck size={17} />
            <p>
              {WARNING} Жүйе сатып алуды тоқтатпайды және мемлекеттік органның
              заңды өкілеттіктерін алмастырмайды.
            </p>
          </div>
          <footer className="page-footer">
            <span>
              QARJY CONTROL <b>Value Gate</b>
            </span>
            <span>Дәлел → Талдау → Негізделген шешім</span>
          </footer>
        </main>
      </div>
      {editor && (
        <Modal
          key={editor.title}
          editor={editor}
          close={() => setEditor(null)}
        />
      )}
      {preview && (
        <div className="overlay">
          <section role="dialog" aria-modal="true" className="modal">
            <header>
              <h2>Импортты растау</h2>
              <button
                className="icon-button"
                onClick={() => setPreview(null)}
                aria-label="Жабу"
              >
                <X />
              </button>
            </header>
            <p>
              {preview.rows.length} жазба тексерілді. Режим:{" "}
              {mode === "demo" ? "Шартты дерек" : "Нақты дерек"}. Бар
              идентификаторлар ауыстырылмайды.
            </p>
            <pre>{JSON.stringify(preview.rows.slice(0, 3), null, 2)}</pre>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <footer>
              <button
                className="button secondary"
                onClick={() => setPreview(null)}
              >
                Бас тарту
              </button>
              <button
                className="button primary"
                disabled={saving}
                onClick={() =>
                  run(async () => {
                    const old = data[preview.kind];
                    const oldIds = new Set(old.map((r) => r.id));
                    if (
                      preview.rows.some((r) =>
                        oldIds.has((r as { id: string }).id),
                      )
                    )
                      throw new Error(
                        "Бар идентификатор қайталанды. Файлды түзетіңіз.",
                      );
                    await persist({
                      ...data,
                      [preview.kind]: [...old, ...preview.rows],
                    });
                    setPreview(null);
                  })
                }
              >
                Дерекқорға сақтау
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon?: React.ReactNode;
}) {
  return (
    <section className="metric">
      <div className="metric-label">
        {label}
        {icon && <span>{icon}</span>}
      </div>
      <strong>{value}</strong>
      <p>{sub}</p>
    </section>
  );
}
function RequestTable({
  rows,
  onSelect,
  onEdit,
  onDelete,
}: {
  rows: Request[];
  onSelect: (r: Request) => void;
  onEdit?: (r: Request) => void;
  onDelete?: (r: Request) => void;
}) {
  if (!rows.length) return <Empty />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Өтінім / мемлекеттік орган</th>
            <th>Жоспарланған сома</th>
            <th>Тексеру мәртебесі</th>
            <th>Әрекет</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <button className="row-title" onClick={() => onSelect(r)}>
                  {r.title}
                </button>
                <small>
                  {r.id} · {r.organization}
                </small>
              </td>
              <td className="nowrap">
                {money(analyze(r).plannedCost)}
                <small>
                  {r.plannedQuantity ?? "—"} {r.unit}
                </small>
              </td>
              <td>{badge(analyze(r).status)}</td>
              <td>
                <button className="text-link" onClick={() => onSelect(r)}>
                  Тексеру <ArrowUpRight size={14} />
                </button>
                {onEdit && (
                  <button className="text-link" onClick={() => onEdit(r)}>
                    Өзгерту
                  </button>
                )}
                {onDelete && (
                  <button
                    className="text-link danger"
                    onClick={() => onDelete(r)}
                  >
                    Жою
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
