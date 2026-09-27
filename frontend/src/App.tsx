import { useEffect, useRef, useState } from "react";
import fixture from "../../fixture/oasis_demo.json";
import { loadInitial, runWalker, type Engine } from "./api";
import { FINDING_STEPS, move, stale, stepLabel, type Ordered } from "./playback";
import { sourceLabel, type Evidence, type Finding, type GraphSnapshot } from "./types";

type Step = "human" | "collect" | Ordered;

const FINDINGS = new Set<string>(FINDING_STEPS);

function words(status: string) {
  if (status === "ACTION_READY") return "Action ready";
  if (status === "COLLECTING_EVIDENCE") return "Collecting evidence";
  const text = status.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function chipKind(evidence: Evidence): string {
  if (evidence.source_type === "SIMULATED_BUSINESS_DATA") return "simulated";
  if (evidence.source_type === "PUBLIC_EVIDENCE" || evidence.source_type === "PUBLIC_OBSERVATION") return "public";
  if (evidence.source_type === "HYPOTHESIS") return "inference";
  return "gap";
}

function linked(snapshot: GraphSnapshot, ids: string[]) {
  const byId = new Map(snapshot.evidence.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is Evidence => Boolean(item));
}

function nowStage(snapshot: GraphSnapshot | null, id: string) {
  if (!snapshot || !id) return "";
  if (id === "finding-confirm") return "CONFIRM";
  const finding = snapshot.findings.find((item) => item.id === id);
  return snapshot.evidence.find((item) => item.id === finding?.supporting_evidence_ids[0])?.stage ?? "";
}

function gloss(verdict: string) {
  if (verdict === "REJECTED") return "Evidence does not support this explanation.";
  if (verdict === "HYPOTHESIS") return "Plausible, but more evidence is required.";
  if (verdict === "ACTION_READY") return "Enough evidence exists to justify testing an intervention. Not a proven revenue leak.";
  return "";
}

const STORY: Record<string, { q: string; a: string; note?: string }> = {
  "finding-price": {
    q: "Is evening pricing causing customers to stop?",
    a: "No. The available evidence doesn't support that conclusion.",
    note: "Oasis publicly lists both price levels, but we have no evidence connecting evening pricing to abandonment.",
  },
  "finding-room-time": {
    q: "Does reserved room time create friction?",
    a: "Possibly. We found a reason to investigate it, but not enough evidence to act.",
  },
  "finding-confirm": {
    q: "Booking → confirmation creates uncertainty worth testing.",
    a: "Customers can submit a booking request before their visit is actually confirmed.",
  },
};

export function App() {
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null);
  const [engine, setEngine] = useState<Engine>({ mode: "jac", note: "" });
  const [step, setStep] = useState<Step>("human");
  const [graph, setGraph] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [photo, setPhoto] = useState(true);
  const gen = useRef(0);
  const runningRef = useRef(false);
  const busy = useRef(false);
  const snapRef = useRef<GraphSnapshot | null>(null);
  const engineRef = useRef(engine);
  const graphButton = useRef<HTMLButtonElement>(null);

  function publish(next: GraphSnapshot, nextEngine: Engine) {
    snapRef.current = next;
    engineRef.current = nextEngine;
    setSnapshot(next);
    setEngine(nextEngine);
  }

  useEffect(() => {
    const token = gen.current;
    loadInitial().then((result) => {
      if (stale(token, gen.current)) return;
      publish(result.snapshot, result.engine);
    });
  }, []);

  async function run(token: number, name: string, body: Record<string, string> = {}) {
    const current = snapRef.current;
    if (!current || stale(token, gen.current)) throw new Error("cancelled");
    const result = await runWalker(engineRef.current, current, name, body);
    if (stale(token, gen.current)) throw new Error("cancelled");
    publish(result.snapshot, result.engine);
  }

  async function reset() {
    const token = ++gen.current;
    runningRef.current = false;
    busy.current = false;
    setRunning(false);
    setEvaluating(false);
    setError("");
    setDrawerId(null);
    setGraph(false);
    setSelected("");
    setStep("human");
    snapRef.current = null;
    setSnapshot(null);
    const result = await loadInitial();
    if (stale(token, gen.current)) return;
    publish(result.snapshot, result.engine);
  }

  async function investigate() {
    if (runningRef.current || !snapRef.current) return;
    const token = gen.current;
    runningRef.current = true;
    setRunning(true);
    setError("");
    setDrawerId(null);
    setGraph(false);
    setStep("collect");
    try {
      await run(token, "undercover_walk");
      await run(token, "market_walk");
      await run(token, "ops_walk");
      setStep("finding-price");
      setEvaluating(true);
      await run(token, "skeptic_operator_walk", { finding_id: "finding-price" });
    } catch (err) {
      if (stale(token, gen.current) || (err instanceof Error && err.message === "cancelled")) return;
      setError(err instanceof Error ? err.message : "The investigation stopped.");
    } finally {
      if (!stale(token, gen.current)) {
        runningRef.current = false;
        setRunning(false);
        setEvaluating(false);
      }
    }
  }

  async function show(target: Ordered) {
    if (busy.current) return;
    const token = gen.current;
    const snap = snapRef.current;
    if (!snap) return;
    setDrawerId(null);
    setGraph(false);
    const needsSkeptic = FINDINGS.has(target) && !snap.findings.find((item) => item.id === target)?.verdict;
    const needsMonitor = target === "monitor" && snap.monitors.length === 0;
    if (!needsSkeptic && !needsMonitor) {
      setStep(target);
      return;
    }
    busy.current = true;
    setStep(target);
    setEvaluating(needsSkeptic);
    try {
      await run(token, needsMonitor ? "start_monitoring" : "skeptic_operator_walk", needsMonitor ? {} : { finding_id: target });
    } catch (err) {
      if (stale(token, gen.current) || (err instanceof Error && err.message === "cancelled")) return;
      setError(err instanceof Error ? err.message : "The investigation stopped.");
    } finally {
      busy.current = false;
      if (!stale(token, gen.current)) setEvaluating(false);
    }
  }

  function previous() {
    const prior = move(step, -1);
    if (!prior) return;
    setDrawerId(null);
    setGraph(false);
    setStep(prior);
  }

  const mission = snapshot?.mission?.statement ?? fixture.mission.statement;
  const supporting = snapshot?.mission?.supporting ?? fixture.mission.supporting;
  const place = snapshot?.business ? `${snapshot.business.name} · ${snapshot.business.city}` : "Oasis Hot Tub Gardens · Ann Arbor, Michigan";
  const label = stepLabel(step);
  const drawer = snapshot?.evidence.find((item) => item.id === drawerId) ?? null;
  const focusId = step === "fix" || step === "monitor" ? "finding-confirm" : FINDINGS.has(step) ? step : "";
  const open = step === "human" && !graph;

  return (
    <div className="app" data-open={open ? "1" : "0"}>
      <header className="top">
        <div>
          <div className="brand">Revenue Leak Engine</div>
          <p className="place">{place}</p>
          {open && <p className="place">Case study. Not an Oasis product.</p>}
          {!open && <p className="place">Public case study. Not an Oasis product, customer, or partnership.</p>}
          {label && <p className="place" aria-live="polite">{label}</p>}
        </div>
        <div className="top-actions">
          <button type="button" className="text-btn" onClick={() => void reset()}>Reset demo</button>
          {move(step, -1) && <button type="button" className="ghost" onClick={previous}>Previous</button>}
          {move(step, 1) && step !== "fix" && step !== "finding-confirm" && (
            <button type="button" className="primary" onClick={() => { const next = move(step, 1); if (next) void show(next); }} disabled={evaluating}>Next</button>
          )}
          <button type="button" className="text-btn" ref={graphButton} onClick={() => setGraph(true)}>View Opportunity Graph</button>
        </div>
      </header>
      {engine.mode === "local_fixture" && <p className="banner">{engine.note}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <section className="hero">
        <div>
          {open && <p className="kicker">Customer mission</p>}
          <h1 className="mission">{mission}</h1>
          {open && (
            <>
              <p className="support">{supporting}</p>
              <p className="task">Find where this opportunity becomes uncertain.</p>
              <p className="task">Revenue stays unquantified. The question is where this visit becomes uncertain.</p>
              <div className="actions">
                <button type="button" className="primary" disabled={!snapshot || running} onClick={() => void investigate()}>
                  {snapshot ? "Investigate journey" : "Preparing the case"}
                </button>
              </div>
            </>
          )}
        </div>
        {open && photo && (
          <figure className="photo">
            <img src="/garden-illustrative.png" alt="Illustrative garden. Not a photograph of Oasis." onError={() => setPhoto(false)} />
            <figcaption>Illustrative. Not a photograph of Oasis.</figcaption>
          </figure>
        )}
      </section>
      <Journey snapshot={snapshot} quiet={open} nowName={nowStage(snapshot, focusId)} />
      {snapshot && graph && <Graph snapshot={snapshot} selected={selected} onSelect={setSelected} onBack={() => { setGraph(false); graphButton.current?.focus(); }} />}
      {snapshot && !graph && step === "collect" && !error && (
        <p className="panel lede">Reading the public journey.</p>
      )}
      {snapshot && !graph && FINDINGS.has(step) && (
        <Skeptic snapshot={snapshot} focusId={step} evaluating={evaluating} label={label} onEvidence={setDrawerId} onFix={() => void show("fix")} />
      )}
      {snapshot && !graph && step === "fix" && <Fix snapshot={snapshot} onMonitor={() => void show("monitor")} />}
      {snapshot && !graph && step === "monitor" && <Monitor snapshot={snapshot} />}
      {drawer && snapshot && (
        <Drawer
          evidence={drawer}
          finding={snapshot.findings.find((item) => item.supporting_evidence_ids.includes(drawer.id) || item.counter_evidence_ids.includes(drawer.id)) ?? null}
          onClose={() => setDrawerId(null)}
        />
      )}
    </div>
  );
}

function RefButton({ item, onOpen }: { item: Evidence; onOpen: (id: string) => void }) {
  const simulated = item.source_type === "SIMULATED_BUSINESS_DATA";
  return (
    <button type="button" className="chip" data-kind={chipKind(item)} onClick={() => onOpen(item.id)}>
      <small>{item.provenance_label}</small>
      {simulated ? item.summary : item.claim_supported}
    </button>
  );
}

function Journey({ snapshot, quiet, nowName }: {
  snapshot: GraphSnapshot | null; quiet: boolean; nowName: string;
}) {
  const stages = snapshot?.stages ?? fixture.stages.map((name, index) => ({
    jac_id: name, id: name, name, sequence: index + 1, status: "UNKNOWN",
  }));
  return (
    <div className="rail" aria-label="Customer journey">
      {stages.map((stage) => {
        const now = !quiet && stage.name === nowName;
        return (
          <div className="stage" data-status={stage.status} data-now={now ? "1" : "0"} aria-current={now ? "step" : undefined} key={stage.id}>
            <div className="stage-name">
              {stage.name}
              {!quiet && <span className="status-word">{words(stage.status)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Skeptic({ snapshot, focusId, evaluating, label, onEvidence, onFix }: {
  snapshot: GraphSnapshot; focusId: string; evaluating: boolean; label: string; onEvidence: (id: string) => void; onFix: () => void;
}) {
  const focus = snapshot.findings.find((item) => item.id === focusId);
  const story = STORY[focusId];
  if (!focus || !story) return null;
  const shown = focus.verdict && !evaluating ? focus.verdict.verdict : "";
  const support = linked(snapshot, focus.supporting_evidence_ids);
  const counter = linked(snapshot, focus.counter_evidence_ids);
  if (!shown) {
    return <section className="panel" aria-live="polite"><p className="kicker">{label}</p><p className="reason">Testing this explanation against the evidence.</p></section>;
  }
  return (
    <section className="panel" aria-live="polite">
      <p className="kicker">{label}</p>
      <p className="stamp" data-v={shown}><strong>{words(shown)}</strong></p>
      <p className="source-note">{gloss(shown)}</p>
      <h2>{story.q}</h2>
      <p className="reason">{story.a}</p>
      {story.note && <p className="lede">{story.note}</p>}
      {shown === "ACTION_READY" && (
        <>
          <div className="field"><span>Customer impact</span><p>I submitted a request, but I don't know whether my visit is confirmed.</p></div>
          <div className="field"><span>Business question</span><p>Are booking requests failing to become confirmed visits?</p></div>
          <div className="actions"><button type="button" className="primary" onClick={onFix}>Fix this first</button></div>
        </>
      )}
      <details key={focusId}>
        <summary>View evidence</summary>
        <p className="kicker">Observation</p>
        <div className="chips">{support.map((item) => <RefButton key={item.id} item={item} onOpen={onEvidence} />)}</div>
        <p className="kicker">Counterevidence</p>
        <div className="chips">{counter.map((item) => <RefButton key={item.id} item={item} onOpen={onEvidence} />)}</div>
        <ul className="unknowns">{focus.unknowns.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="warning">{snapshot.meta.coverage_warning}</p>
        {focus.verdict && <p className="source-note">{focus.verdict.reason}</p>}
        {focus.verdict && <p className="source-note">{sourceLabel(focus.verdict.reasoning_source)}</p>}
      </details>
    </section>
  );
}

function Fix({ snapshot, onMonitor }: { snapshot: GraphSnapshot; onMonitor: () => void }) {
  const action = snapshot.actions[0];
  const finding = snapshot.findings.find((item) => item.id === action?.finding_id);
  if (!action || !finding) {
    return <section className="panel"><h2>No action.</h2><p className="lede">Nothing is action-ready.</p></section>;
  }
  return (
    <section className="panel">
      <h2>Fix first</h2>
      <p className="reason">Remove uncertainty after a booking request.</p>
      <p className="kicker">Tell the customer</p>
      <ol className="unknowns">
        <li>Your booking has been requested, not confirmed.</li>
        <li>Here's when you'll hear from us.</li>
        <li>Here's what to do if confirmation doesn't arrive.</li>
      </ol>
      <div className="actions">
        <button type="button" className="primary" onClick={onMonitor}>Start monitoring</button>
      </div>
      <div className="field"><span>Why this?</span><p>Public evidence shows that online selections require later staff confirmation.</p></div>
      <div className="impact">
        <p className="kicker">Revenue impact</p>
        <p>Unquantified</p>
        <p className="lede">Financial impact requires first-party business evidence.</p>
      </div>
      <details>
        <summary>View evidence</summary>
        <p className="source-note">{finding.verdict?.reason}</p>
        <p className="source-note">{action.measurement_required}</p>
        {finding.verdict && <p className="source-note">{sourceLabel(finding.verdict.reasoning_source)}</p>}
        <p className="source-note">Simulated business data. Not provided by Oasis.</p>
      </details>
    </section>
  );
}

function Monitor({ snapshot }: { snapshot: GraphSnapshot }) {
  return (
    <section className="panel">
      <h2>Did the fix work?</h2>
      <div className="field"><span>Status</span><p>{words(snapshot.monitors[0]?.status ?? "COLLECTING_EVIDENCE")}</p></div>
      <div className="field"><span>We're measuring</span><p>Booking requests → confirmed visits</p></div>
      <div className="field"><span>Baseline</span><p>Awaiting first-party data</p></div>
      <div className="field"><span>Next evidence needed</span><p>Booking request and confirmation records</p></div>
      <div className="impact">
        <p className="kicker">Revenue impact</p>
        <p>Unquantified</p>
        <p className="lede">We won't estimate financial impact until the business provides sufficient evidence.</p>
      </div>
      <p className="source-note">Oasis was not changed. No live monitor is connected.</p>
      <p className="source-note">This demo is not saved. Opening the page again starts over. Nothing changes until booking and confirmation records exist.</p>
    </section>
  );
}

function relate(snapshot: GraphSnapshot, id: string) {
  const say = (title: string, bits: string[]) => ({ title, bits });
  const ev = snapshot.evidence.find((item) => item.id === id);
  if (ev) {
    const verdict = snapshot.findings.find((item) => (item.supporting_evidence_ids.includes(id) || item.counter_evidence_ids.includes(id)) && item.verdict)?.verdict;
    return say(ev.claim_supported, [verdict ? words(verdict.verdict) : "No verdict yet.", ev.summary, ev.source_type]);
  }
  const finding = snapshot.findings.find((item) => item.id === id);
  if (finding) return say(finding.title, finding.verdict ? [words(finding.verdict.verdict), sourceLabel(finding.verdict.reasoning_source)] : ["No verdict yet."]);
  const stage = snapshot.stages.find((item) => item.id === id);
  if (stage) return say(stage.name, [words(stage.status)]);
  const action = snapshot.actions.find((item) => item.id === id);
  if (action) return say("Fix first", [action.what_to_change]);
  const monitor = snapshot.monitors.find((item) => item.id === id);
  if (monitor) return say("Monitor", [words(monitor.status), "Unquantified"]);
  if (snapshot.mission?.id === id) return say("Mission", [snapshot.mission.statement]);
  if (snapshot.opportunity?.id === id && snapshot.opportunity) return say("Opportunity", [snapshot.opportunity.revenue_impact]);
  if (snapshot.business?.id === id && snapshot.business) return say("Business", [snapshot.business.name]);
  return null;
}

function Graph({ snapshot, selected, onSelect, onBack }: {
  snapshot: GraphSnapshot; selected: string; onSelect: (id: string) => void; onBack: () => void;
}) {
  const rows: Array<{ id: string; kind: string; label: string }> = [];
  const add = (id: string | undefined, kind: string, label: string) => { if (id) rows.push({ id, kind, label }); };
  add(snapshot.business?.id, "Business", snapshot.business?.name ?? "");
  add(snapshot.opportunity?.id, "Opportunity", "This visit");
  add(snapshot.mission?.id, "Mission", "I just want to decompress.");
  for (const stage of snapshot.stages) add(stage.id, "Stage", `${stage.name} · ${words(stage.status)}`);
  for (const item of snapshot.evidence) add(item.id, item.provenance_label, item.stage);
  for (const item of snapshot.findings) add(item.id, words(item.status), item.title);
  for (const item of snapshot.actions) add(item.id, "Action", item.title);
  for (const item of snapshot.monitors) add(item.id, "Monitor", words(item.status));
  const explained = relate(snapshot, selected);
  return (
    <section className="graph" aria-label="Opportunity graph">
      <button type="button" className="text-btn" autoFocus onClick={onBack}>Back</button>
      <h2>Technical proof: Jac Opportunity Graph</h2>
      <p className="lede">Revenue Leak Engine stores the customer opportunity, journey stages, evidence, findings, actions, and monitoring state as a Jac/Jaseci graph. Walkers traverse and update this graph during an investigation.</p>
      {explained ? (
        <div className="explain">
          <p className="kicker">{explained.title}</p>
          {explained.bits.map((bit) => <p key={bit}>{bit}</p>)}
        </div>
      ) : <p className="lede">Select a node.</p>}
      <div className="tree">
        {rows.map((row) => (
          <button type="button" key={row.id} className="node-btn" aria-current={selected === row.id ? "true" : undefined} onClick={() => onSelect(row.id)}>
            <small>{row.kind}</small>{row.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function Drawer({ evidence, finding, onClose }: { evidence: Evidence; onClose: () => void; finding: Finding | null }) {
  const panelRef = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = panelRef.current;
    root?.querySelector("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); opener?.focus(); };
  }, [evidence.id]);
  return (
    <>
      <button type="button" className="drawer-back" aria-label="Close evidence" onClick={onClose} />
      <aside className="drawer" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="evidence-title">
        <button type="button" className="text-btn" onClick={onClose}>Close</button>
        <p className="kicker">{evidence.provenance_label}</p>
        <p className="source-note" data-kind={chipKind(evidence)}>{evidence.source_type === "SIMULATED_BUSINESS_DATA" ? "Simulated business data. Demonstration only. Not provided by Oasis." : evidence.source_type.startsWith("PUBLIC") ? "Real public evidence. Observed from publicly available Oasis information." : evidence.provenance_label}</p>
        <h2 id="evidence-title">{evidence.stage}</h2>
        <div className="field"><span>Observation</span><p>{evidence.summary}</p></div>
        <div className="field"><span>Provenance</span><p>{evidence.source_type} · {evidence.collected_by}</p></div>
        {finding?.verdict && <p className="source-note">{words(finding.verdict.verdict)}. {sourceLabel(finding.verdict.reasoning_source)}</p>}
        {evidence.source_url && <p><a href={evidence.source_url} target="_blank" rel="noreferrer">Source page</a></p>}
      </aside>
    </>
  );
}
