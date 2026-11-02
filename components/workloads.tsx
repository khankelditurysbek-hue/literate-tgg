"use client";
import { useState, type FormEvent } from "react";
import { Plus, Download, X } from "lucide-react";
import {
  workloadSchema,
  type Dataset,
  type Mode,
  type Workload,
} from "@/lib/model";
import {
  causeLabels,
  newWorkload,
  officialWorkloadCase,
  sourceCaseId,
  utilization,
} from "@/lib/utilization";
import { money } from "@/lib/calculations";
const choices = [
  ["unknown", "Белгісіз"],
  ["yes", "Иә"],
  ["no", "Жоқ"],
];
export function Workloads({
  data,
  mode,
  saving,
  persist,
}: {
  data: Dataset;
  mode: Mode;
  saving: boolean;
  persist: (next: Dataset) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Workload | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  async function run(fn: () => Promise<void>) {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сақтау қатесі");
    }
  }
  async function save(w: Workload) {
    const next = {
      ...data,
      workloads: data.workloads.some((v) => v.id === w.id)
        ? data.workloads.map((v) => (v.id === w.id ? w : v))
        : [...data.workloads, w],
    };
    await persist(next);
    setEditing(null);
    setPreview(false);
  }
  return (
    <>
      <section className="panel padded">
        <h2>Актив қуаты нақты қаншалықты пайдаланылады?</h2>
        <p>
          Қуат пен нақты пайдалану бір кезеңге, бір өлшемге және бір қызмет
          анықтамасына сәйкес болуы тиіс. Бұл ретроспективті көрсеткіш жаңа
          сатып алудың қажеттілігін толық тексеруді алмастырмайды; негізгі
          KRI-ге қосылмайды.
        </p>
        <div className="formula">
          Жүктеме = нақты пайдалану ÷ есептік қуат × 100%
        </div>
        <div className="note">
          30% — өзгертілетін бастапқы қарау шегі. Бұл заңдық норматив немесе
          тәуекел ықтималдығы емес. Шектен жоғары жүктеме тиімділікке кепіл
          болмайды. Төмен жүктеме шұғыл резервпен, географиямен, маманмен немесе
          қызметті ұйымдастырумен түсіндірілуі мүмкін.
        </div>
        <div className="toolbar">
          <button
            className="button primary"
            disabled={saving}
            onClick={() => setEditing(newWorkload(mode))}
          >
            <Plus size={16} /> Жүктеме жазбасын қосу
          </button>
          {mode === "real" && (
            <button
              className="button secondary"
              disabled={
                saving || data.workloads.some((w) => w.id === sourceCaseId)
              }
              onClick={() => setPreview(true)}
            >
              Шиелі аудит кейсін қарау
            </button>
          )}
          <a
            className="button secondary"
            href={`/api/files?mode=${mode}&kind=workloads&format=csv`}
          >
            <Download size={16} /> Жүктеме CSV
          </a>
          <a
            className="button secondary"
            href={`/api/files?mode=${mode}&kind=workloads&format=xlsx`}
          >
            <Download size={16} /> Жүктеме XLSX
          </a>
        </div>
      </section>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {data.workloads.length === 0 ? (
        <section className="panel empty">
          <strong>Жүктеме жазбалары енгізілмеген</strong>
          <p>
            Өз дерегіңізді қосыңыз немесе нақты аудит кейсін алдын ала қараңыз.
          </p>
        </section>
      ) : (
        data.workloads.map((w) => {
          const a = utilization(w);
          return (
            <section className="panel padded" key={w.id}>
              <div className="panel-head flush">
                <div>
                  <h2>{w.asset}</h2>
                  <p>
                    {w.organization} · {w.periodStart} — {w.periodEnd}
                  </p>
                </div>
                <span className={`badge ${a.low ? "amber" : "gray"}`}>
                  {a.status}
                </span>
              </div>
              <div className="stats-grid three">
                <div className="metric">
                  <span>Есептік қуат · {w.unit}</span>
                  <strong>{w.capacity ?? "Белгісіз"}</strong>
                </div>
                <div className="metric">
                  <span>Нақты пайдалану · {w.unit}</span>
                  <strong>{w.actual ?? "Белгісіз"}</strong>
                </div>
                <div className="metric">
                  <span>Арифметикалық жүктеме</span>
                  <strong>
                    {a.percentage === null
                      ? "Есептелмейді"
                      : a.percentage.toFixed(2) + "%"}
                  </strong>
                  <p>Қарау шегі: {w.threshold}%</p>
                </div>
              </div>
              {a.gaps.map((g) => (
                <div className="warning" key={g}>
                  {g}
                </div>
              ))}
              <p>
                <strong>Қуат негіздемесі:</strong> {w.basis || "Белгісіз"}
              </p>
              <p>
                <strong>Сатып алу өтініміндегі жоспарланған сома:</strong>{" "}
                {money(w.plannedAmount)}. Бұл төленген сома, TCO немесе үнем
                емес.
              </p>
              <details>
                <summary>Төмен жүктеменің себептері мен дәлелдері</summary>
                <dl>
                  {Object.entries(causeLabels).map(([key, label]) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>
                        {
                          choices.find(
                            ([v]) =>
                              v === w.reasons[key as keyof Workload["reasons"]],
                          )?.[1]
                        }
                      </dd>
                    </div>
                  ))}
                </dl>
                <p>
                  {w.expertConclusion || "Сарапшы қорытындысы енгізілмеген."}
                </p>
              </details>
              <p className="note">
                {w.evidence.document}
                <br />
                {w.sourcePages}
                <br />
                {w.evidence.url && (
                  <a href={w.evidence.url} target="_blank" rel="noreferrer">
                    Дереккөзді ашу ↗
                  </a>
                )}{" "}
                · Дерек алынған күн: {w.evidence.date || "Белгісіз"}
              </p>
              <p className="muted">{a.conclusion}</p>
              <div className="toolbar">
                <button
                  className="button secondary"
                  disabled={saving}
                  onClick={() => setEditing(w)}
                >
                  Жүктеме жазбасын өзгерту
                </button>
                <button
                  className="text-link danger"
                  disabled={saving}
                  onClick={() => {
                    if (confirm("Жүктеме жазбасын жою керек пе?"))
                      void run(() =>
                        persist({
                          ...data,
                          workloads: data.workloads.filter(
                            (x) => x.id !== w.id,
                          ),
                        }),
                      );
                  }}
                >
                  Жүктеме жазбасын жою
                </button>
              </div>
            </section>
          );
        })
      )}
      {preview && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Ресми аудит кейсі"
          >
            <header>
              <h2>Шиелі · нақты аудит деректері</h2>
              <button
                className="icon-button"
                aria-label="Жабу"
                onClick={() => setPreview(false)}
              >
                <X />
              </button>
            </header>
            <p>
              Есептік қуат: 5 080 пациент. Нақты: 914. Жүктеме: 17,99%. 2023
              жылғы сатып алу өтінімінде бір аппаратқа 56 484 700 ₸
              жоспарланған.
            </p>
            <p>
              Ресми PDF-тің 12 және 25-беттеріндегі сандар суретпен
              салыстырылды.{" "}
              <a
                href="https://budget.egov.kz/budgetfile/file?fileId=4373694#page=25"
                target="_blank"
                rel="noreferrer"
              >
                Бірінші PDF, 25-бет ↗
              </a>
              .{" "}
              <a
                href="https://budget.egov.kz/budgetfile/file?fileId=4373695#page=3"
                target="_blank"
                rel="noreferrer"
              >
                Екінші PDF, құжаттың 33-беті ↗
              </a>
              .
            </p>
            <div className="warning">
              Аудиттің 33-бетіндегі бөлім қорытындысында бұзушылықтар
              анықталмағаны жазылған. Төмен жүктемені «артық сатып алу» деп
              түсіндіруге болмайды. Бос активтер, болашақ қажеттілік және
              салыстырмалы шығындар белгісіз. 30% шек — қолданбадағы бастапқы
              параметр.
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <footer>
              <button
                className="button secondary"
                onClick={() => setPreview(false)}
              >
                Бас тарту
              </button>
              <button
                className="button primary"
                disabled={saving}
                onClick={() => void run(() => save(officialWorkloadCase()))}
              >
                Нақты дерекке қосу
              </button>
            </footer>
          </section>
        </div>
      )}
      {editing && (
        <WorkloadForm
          key={editing.id}
          value={editing}
          mode={mode}
          saving={saving}
          close={() => setEditing(null)}
          save={save}
        />
      )}
    </>
  );
}
function WorkloadForm({
  value,
  mode,
  saving,
  save,
  close,
}: {
  value: Workload;
  mode: Mode;
  saving: boolean;
  save: (w: Workload) => Promise<void>;
  close: () => void;
}) {
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "");
    const num = (k: string) => (str(k) === "" ? null : Number(str(k)));
    try {
      const w = workloadSchema.parse({
        ...value,
        organization: str("organization"),
        asset: str("asset"),
        unit: str("unit"),
        periodStart: str("periodStart"),
        periodEnd: str("periodEnd"),
        capacity: num("capacity"),
        actual: num("actual"),
        plannedAmount: num("plannedAmount"),
        threshold: Number(str("threshold")),
        comparable: str("comparable"),
        basis: str("basis"),
        sourcePages: str("sourcePages"),
        expertConclusion: str("expertConclusion"),
        reasons: Object.fromEntries(
          Object.keys(causeLabels).map((k) => [k, str(k)]),
        ),
        evidence: {
          source: str("source"),
          document: str("document"),
          url: str("url"),
          date: str("date"),
          reliability: str("reliability"),
          verified: f.get("verified") === "on",
        },
        updatedAt: new Date().toISOString(),
      });
      await save(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Дерек жарамсыз");
    }
  }
  const fields: [keyof Workload, string, string, boolean][] = [
    ["organization", "Ұйым", "text", true],
    ["asset", "Актив атауы", "text", true],
    ["unit", "Ортақ өлшем бірлігі", "text", true],
    ["periodStart", "Кезеңнің басы", "date", true],
    ["periodEnd", "Кезеңнің соңы", "date", true],
    ["capacity", "Есептік қуат", "number", false],
    ["actual", "Нақты пайдалану", "number", false],
    ["plannedAmount", "Өтінімдегі жоспарланған сома, ₸", "number", false],
    ["threshold", "Қарау шегі, % (1–100)", "number", true],
  ];
  return (
    <div className="overlay">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Жүктеме жазбасы"
        className="modal"
      >
        <header>
          <h2>Жүктеме жазбасы</h2>
          <button
            className="icon-button"
            aria-label="Жабу"
            disabled={saving}
            onClick={close}
          >
            <X />
          </button>
        </header>
        <p className="muted">
          Бос сан — белгісіз. Нақты нөлді 0 деп енгізіңіз. Қуат пен пайдалану
          бір қызметтің бір кезеңдегі көрсеткіші болуы тиіс.
        </p>
        <form onSubmit={submit}>
          <div className="form-grid">
            {fields.map(([key, label, type, required]) => (
              <label key={key}>
                {label}
                {required ? " *" : ""}
                <input
                  name={key}
                  type={type}
                  min={type === "number" ? 0 : undefined}
                  step={key === "plannedAmount" ? "0.01" : 1}
                  required={required}
                  defaultValue={String(value[key] ?? "")}
                />
              </label>
            ))}
            <label>
              Кезең, өлшем және анықтама сәйкестігі
              <select name="comparable" defaultValue={value.comparable}>
                {choices.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {(["basis", "sourcePages", "expertConclusion"] as const).map(
              (key, i) => (
                <label className="span2" key={key}>
                  {
                    [
                      "Қуаттың есептелу негіздемесі",
                      "Құжат беттері / көрсеткіштерге дәлел",
                      "Сарапшы қорытындысы",
                    ][i]
                  }
                  <textarea name={key} defaultValue={value[key]} />
                </label>
              ),
            )}
            {Object.entries(causeLabels).map(([key, label]) => (
              <label key={key}>
                {label}
                <select
                  name={key}
                  defaultValue={value.reasons[key as keyof Workload["reasons"]]}
                >
                  {choices.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {(["source", "document", "url", "date"] as const).map((key, i) => (
              <label key={key}>
                {
                  [
                    "Дереккөз",
                    "Құжат атауы",
                    "HTTP/HTTPS сілтемесі",
                    "Дерек алынған күн",
                  ][i]
                }
                <input
                  name={key}
                  type={key === "date" ? "date" : "text"}
                  defaultValue={value.evidence[key]}
                />
              </label>
            ))}
            <label>
              Дерек сенімділігі
              <select
                name="reliability"
                defaultValue={value.evidence.reliability}
              >
                {(mode === "demo"
                  ? [["demo", "Шартты дерек"]]
                  : [
                      ["unverified", "Тексерілмеген"],
                      ["documented", "Құжаттық расталған"],
                      ["official", "Ресми дереккөз"],
                    ]
                ).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox">
              Құжат пен көрсеткіштерді тексердім
              <input
                name="verified"
                type="checkbox"
                defaultChecked={value.evidence.verified}
              />
            </label>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <footer>
            <button
              className="button secondary"
              disabled={saving}
              type="button"
              onClick={close}
            >
              Бас тарту
            </button>
            <button className="button primary" disabled={saving}>
              Сақтау
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
