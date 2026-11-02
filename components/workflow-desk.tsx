"use client";
import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Search,
  X,
} from "lucide-react";
import type { Dataset, Request, Stage } from "@/lib/model";
import {
  stageLabels,
  nextStages,
  updateWorkflow,
  workflowCounts,
} from "@/lib/workflow";
import { analyze, money } from "@/lib/calculations";
export function WorkflowSummary({
  data,
  onOpen,
}: {
  data: Dataset;
  onOpen: () => void;
}) {
  const counts = workflowCounts(data);
  return (
    <section className="panel workflow-summary">
      <div className="panel-head">
        <div>
          <h2>Өтінімдерді қарау барысы</h2>
          <p>Бөлімнің ұсынысынан ішкі келісімге дейін</p>
        </div>
        <button className="text-link" onClick={onOpen}>
          Қарау кезегін ашу <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="stage-metrics">
        {(Object.keys(stageLabels) as Stage[]).map((stage) => (
          <button key={stage} onClick={onOpen}>
            <span className={`stage-dot ${stage}`} />
            <strong>{counts[stage]}</strong>
            <span>{stageLabels[stage]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
export function WorkflowDesk({
  data,
  saving,
  persist,
  onOpenRequest,
}: {
  data: Dataset;
  saving: boolean;
  persist: (d: Dataset) => Promise<void>;
  onOpenRequest: (r: Request) => void;
}) {
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [editing, setEditing] = useState<Request | null>(null);
  const [error, setError] = useState("");
  const counts = workflowCounts(data);
  const rows = data.requests.filter(
    (r) =>
      (stage === "all" || r.workflow.stage === stage) &&
      (priority === "all" || r.workflow.priority === priority) &&
      `${r.id} ${r.title} ${r.organization} ${r.workflow.department}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "");
    try {
      const next = updateWorkflow(
        editing,
        {
          stage: str("stage") as Stage,
          department: str("department"),
          ownerRole: str("ownerRole"),
          priority: str("priority") as "normal" | "urgent",
          dueDate: str("dueDate"),
        },
        str("role"),
        str("note"),
        f.get("acknowledged") === "on",
      );
      await persist({
        ...data,
        requests: data.requests.map((r) => (r.id === next.id ? next : r)),
      });
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сақтау қатесі");
    }
  }
  return (
    <>
      <section className="panel padded">
        <div className="workflow-intro">
          <div className="small-icon">
            <FileCheck2 size={22} />
          </div>
          <div>
            <h2>Кім ұсынды, кім тексерді, қандай шешім қабылданды?</h2>
            <p className="muted">
              Қызметтік рөлдерді және кезең өзгерістерін тіркеңіз. Бұл ішкі
              бақылау барысы; рөлдік авторизация немесе мемлекеттік сатып алуға
              заңды рұқсат беру жүйесі емес.
            </p>
          </div>
        </div>
        <div className="stage-tabs">
          <button
            className={stage === "all" ? "selected" : ""}
            onClick={() => setStage("all")}
          >
            Барлығы <b>{data.requests.length}</b>
          </button>
          {(Object.keys(stageLabels) as Stage[]).map((key) => (
            <button
              key={key}
              className={stage === key ? "selected" : ""}
              onClick={() => setStage(key)}
            >
              {stageLabels[key]} <b>{counts[key]}</b>
            </button>
          ))}
        </div>
        <div className="workflow-filters">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Қарау кезегін іздеу"
              placeholder="Өтінім, ұйым немесе бөлім"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            Басымдық
            <select
              aria-label="Басымдық сүзгісі"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="all">Барлық басымдық</option>
              <option value="urgent">Жедел</option>
              <option value="normal">Қалыпты</option>
            </select>
          </label>
        </div>
      </section>
      <div className="review-grid">
        {rows.map((r) => {
          const a = analyze(r);
          return (
            <article key={r.id} className="panel review-card">
              <div className="review-card-head">
                <span className="review-id">{r.id}</span>
                <span className={`stage-badge ${r.workflow.stage}`}>
                  {stageLabels[r.workflow.stage]}
                </span>
              </div>
              <h2>{r.title}</h2>
              <p className="muted">{r.organization}</p>
              <strong className="review-amount">{money(a.plannedCost)}</strong>
              <div className="review-facts">
                <span>
                  Ұсынған бөлім
                  <b>{r.workflow.department || "Тағайындалмаған"}</b>
                </span>
                <span>
                  Жауапты рөл<b>{r.workflow.ownerRole || "Тағайындалмаған"}</b>
                </span>
                <span>
                  Басымдық
                  <b>
                    {r.workflow.priority === "urgent" ? "Жедел" : "Қалыпты"}
                  </b>
                </span>
                <span>
                  Қарау мерзімі<b>{r.workflow.dueDate || "Белгісіз"}</b>
                </span>
              </div>
              <div
                className={
                  a.complete && a.status === "Негіздеме жеткілікті"
                    ? "review-signal good"
                    : "review-signal"
                }
              >
                {a.complete && a.status === "Негіздеме жеткілікті" ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Clock3 size={16} />
                )}
                <div>
                  <strong>{a.status}</strong>
                  <small>
                    {a.excess === null
                      ? "Негізделген көлем белгісіз"
                      : `Негізделген жаңа саны: ${a.justified} · Ықтимал артық: ${a.excess}`}
                  </small>
                </div>
              </div>
              <div className="review-actions">
                <button
                  className="button secondary"
                  onClick={() => onOpenRequest(r)}
                >
                  Талдауды ашу <ArrowUpRight size={14} />
                </button>
                <button
                  className="button primary"
                  disabled={saving}
                  onClick={() => {
                    setError("");
                    setEditing(r);
                  }}
                >
                  Кезеңді тіркеу
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <section className="panel empty">
          <strong>Бұл сүзгіге сәйкес өтінім жоқ</strong>
          <p>Сүзгіні өзгертіңіз немесе жаңа өтінім қосыңыз.</p>
        </section>
      )}
      {editing && (
        <div className="overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Өтінім кезеңін тіркеу"
            className="modal"
          >
            <header>
              <div>
                <span className="eyebrow">{editing.id} · ІШКІ БАҚЫЛАУ</span>
                <h2>{editing.title}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Жабу"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </header>
            <div className="note">
              Ағымдағы кезең: {stageLabels[editing.workflow.stage]}. Дерегі
              толық емес өтінімге ішкі келісім берілмейді. Келісілген өтінімді
              өзгертпес бұрын «Тексерілуде» кезеңіне қайтарыңыз.
            </div>
            <form onSubmit={submit}>
              <div className="form-grid">
                <label>
                  Ұсынған бөлім
                  <input
                    name="department"
                    defaultValue={editing.workflow.department}
                  />
                </label>
                <label>
                  Жауапты маманның рөлі
                  <input
                    name="ownerRole"
                    defaultValue={editing.workflow.ownerRole}
                  />
                </label>
                <label>
                  Басымдық
                  <select
                    name="priority"
                    defaultValue={editing.workflow.priority}
                  >
                    <option value="normal">Қалыпты</option>
                    <option value="urgent">Жедел</option>
                  </select>
                </label>
                <label>
                  Қарау мерзімі
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={editing.workflow.dueDate}
                  />
                </label>
                <label>
                  Жаңа кезең
                  <select name="stage" defaultValue={editing.workflow.stage}>
                    {[
                      editing.workflow.stage,
                      ...nextStages[editing.workflow.stage],
                    ].map((k) => (
                      <option key={k} value={k}>
                        {stageLabels[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Оқиғаны тіркеушінің рөлі *
                  <input
                    name="role"
                    required
                    placeholder="Мысалы: ішкі бақылау маманы"
                  />
                </label>
                <label className="span2">
                  Оқиға / шешім негіздемесі *
                  <textarea name="note" required minLength={5} />
                </label>
                <label className="span2 checkbox">
                  Ескертулерді қарап, қабылданған шешімге негіздеме бердім
                  <input type="checkbox" name="acknowledged" />
                </label>
              </div>
              <h3>Есептеу бойынша ескертулер</h3>
              <ul className="review-flags">
                {[...analyze(editing).reasons, ...analyze(editing).flags].map(
                  (flag, i) => (
                    <li key={i}>{flag}</li>
                  ),
                )}
              </ul>
              {editing.workflow.events.length > 0 && (
                <details>
                  <summary>
                    Кезеңдер тарихы · {editing.workflow.events.length}
                  </summary>
                  <div className="workflow-history">
                    {editing.workflow.events.map((event) => (
                      <div key={event.id}>
                        <strong>
                          {stageLabels[event.from]} → {stageLabels[event.to]}
                        </strong>
                        <p>{event.note}</p>
                        <small>
                          {event.role} ·{" "}
                          {new Date(event.at).toLocaleString("kk-KZ")}
                        </small>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <footer>
                <button
                  className="button secondary"
                  type="button"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                >
                  Бас тарту
                </button>
                <button className="button primary" disabled={saving}>
                  Кезеңді сақтау
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
