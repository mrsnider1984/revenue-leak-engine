import { useEffect, useState } from "react";
import fixture from "../../fixture/oasis_demo.json";
import { loadInitial, runWalker, type Engine } from "./api";
import { DEMO_FINDING_ORDER, sourceLabel, type Evidence, type GraphSnapshot } from "./types";

type Phase = "human" | "journey" | "skeptic" | "fix" | "monitor" | "graph";

const fast = new URLSearchParams(window.location.search).has("fast");
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, fast ? 30 : ms));

function chipKind(evidence: Evidence): string {
  if (evidence.source_type === "SIMULATED_BUSINESS_DATA") return "simulated";
  if (evidence.source_type === "PUBLIC_EVIDENCE" || evidence.source_type === "PUBLIC_OBSERVATION") return "public";
  return "gap";
}

function stageStatus(status: string, pending: boolean): string {
  if (pending && status === "UNKNOWN") return "INVESTIGATING";
  return status;
}

export function App() {
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null);
  const [engine, setEngine] = useState<Engine>({ mode: "jac", note: "" });
  const [phase, setPhase] = useState<Phase>("human");
  const [back, setBack] = useState<Phase>("human");
  const [focusId, setFocusId] = useState(DEMO_FINDING_ORDER[0]);
  const [evaluating, setEvaluating] = useState(false);
  const [pending, setPending] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    let alive = true;
    loadInitial().then((result) => {
      if (!alive) return;
      setSnapshot(result.snapshot);
      setEngine(result.engine);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function call(name: string, body: Record<string, string> = {}) {
    if (!snapshot) throw new Error("Graph is not ready");
    const result = await runWalker(engine, snapshot, name, body);
    setEngine(result.engine);
    setSnapshot(result.snapshot);
    return result.snapshot;
  }

  async function reset() {
    setError("");
    setRunning(false);
    setEvaluating(false);
    setPending(false);
    setDrawerId(null);
    setPhase("human");
    const result = await loadInitial();
    setSnapshot(result.snapshot);
    setEngine(result.engine);
  }

  async function investigate() {
    if (!snapshot || running) return;
    setRunning(true);
    setError("");
    setPhase("journey");
    setPending(true);
    try {
      let current = snapshot;
      const step = async (name: string, body: Record<string, string> = {}) => {
        const result = await runWalker(engine, current, name, body);
        current = result.snapshot;
        setEngine(result.engine);
        setSnapshot(result.snapshot);
        return result.snapshot;
      };
      await step("undercover_walk");
      setPending(false);
      await wait(1600);
      await step("market_walk");
      await wait(1800);
      await step("ops_walk");
      await wait(1600);
      for (const findingId of DEMO_FINDING_ORDER) {
        setPhase("skeptic");
        setFocusId(findingId);
        setEvaluating(true);
        await wait(1200);
        await step("skeptic_operator_walk", { finding_id: findingId });
        setEvaluating(false);
        const hold = findingId === "finding-price" ? 4000 : 2200;
        await wait(hold);
      }
      setPhase(current.actions.length ? "fix" : "skeptic");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The investigation stopped.");
    } finally {
      setPending(false);
      setEvaluating(false);
      setRunning(false);
    }
  }

  async function monitor() {
    try {
      await call("start_monitoring");
      setPhase("monitor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Monitoring did not start.");
    }
  }

  function openGraph() {
    if (!snapshot) return;
    setBack(phase === "graph" ? back : phase);
    setPhase("graph");
  }

  const mission = snapshot?.mission?.statement ?? fixture.mission.statement;
  const supporting = snapshot?.mission?.supporting ?? fixture.mission.supporting;
  const business = snapshot?.business;
  const drawer = snapshot?.evidence.find((item) => item.id === drawerId) ?? null;
  const focus = snapshot?.findings.find((item) => item.id === focusId) ?? null;

  return (
    <div className="app">
      {phase !== "human" && (
        <header className="top">
          <div>
            <div className="brand">Revenue Leak Engine</div>
            <div className="place">{business ? `${business.name} · ${business.city}` : "Oasis Hot Tub Gardens · Ann Arbor, Michigan"}</div>
          </div>
          <div className="top-actions">
            <button className="text-btn" onClick={openGraph}>Opportunity graph</button>
            <button className="text-btn" onClick={reset}>Reset demo</button>
          </div>
        </header>
      )}
      {engine.mode === "local_fixture" && phase !== "human" && <p className="banner">{engine.note}</p>}
      {error && <p className="error">{error}</p>}

      {phase === "human" && (
        <section className="human">
          <header className="top">
            <div>
              <div className="brand">Revenue Leak Engine</div>
              <div className="place">Oasis Hot Tub Gardens</div>
              <div className="place">Ann Arbor, Michigan</div>
            </div>
            <button className="text-btn" onClick={reset}>Reset demo</button>
          </header>
          <main>
            <div>
              <div className="kicker">Customer mission</div>
              <h1 className="mission">
                <span>I just want to</span>
                decompress.
              </h1>
              <p className="support">{supporting || mission}</p>
            </div>
            <Journey snapshot={snapshot} pending={false} onEvidence={setDrawerId} quiet />
          </main>
          <div className="actions">
            <button className="primary" disabled={!snapshot || running} onClick={investigate}>Investigate journey</button>
            <button className="linkish" onClick={openGraph}>Explore opportunity graph</button>
          </div>
        </section>
      )}

      {phase === "journey" && snapshot && (
        <section className="screen">
          <div className="kicker">Customer mission</div>
          <h1>{mission}</h1>
          <p className="lede">{supporting}</p>
          <Journey snapshot={snapshot} pending={pending} onEvidence={setDrawerId} />
          <div className="agents">
            <div><strong>Undercover</strong>{snapshot.agent_runs.some((run) => run.agent === "undercover_walk") ? "Customer journey examined" : pending ? "Examining customer journey..." : "Waiting"}</div>
            <div><strong>Market</strong>{snapshot.agent_runs.some((run) => run.agent === "market_walk") ? "Public evidence collected" : "Waiting"}</div>
            <div><strong>CRM / Ops</strong>{snapshot.agent_runs.some((run) => run.agent === "ops_walk") ? "Simulated handoff examined" : "Waiting"}</div>
            <div><strong>Skeptic</strong>Waiting for a candidate finding</div>
          </div>
          <p className="warning">{snapshot.meta.coverage_warning}</p>
        </section>
      )}

      {phase === "skeptic" && snapshot && focus && (
        <Skeptic
          snapshot={snapshot}
          focusId={focusId}
          evaluating={evaluating}
          onEvidence={setDrawerId}
        />
      )}

      {phase === "fix" && snapshot && <Fix snapshot={snapshot} onMonitor={monitor} onWhy={() => setDrawerId(snapshot.evidence.find((item) => item.id === "ev-request")?.id ?? null)} />}
      {phase === "monitor" && snapshot && <Monitor snapshot={snapshot} />}
      {phase === "graph" && snapshot && (
        <Graph snapshot={snapshot} selected={selected} onSelect={setSelected} onBack={() => setPhase(back)} />
      )}
      {drawer && (
        <Drawer
          evidence={drawer}
          onClose={() => setDrawerId(null)}
          finding={snapshot?.findings.find((item) => item.supporting_evidence_ids.includes(drawer.id) || item.counter_evidence_ids.includes(drawer.id)) ?? null}
        />
      )}
    </div>
  );
}

function Journey({
  snapshot,
  pending,
  onEvidence,
  quiet = false,
}: {
  snapshot: GraphSnapshot | null;
  pending: boolean;
  onEvidence: (id: string) => void;
  quiet?: boolean;
}) {
  const stages = snapshot?.stages ?? fixture.stages.map((name, index) => ({
    jac_id: name,
    id: name,
    name,
    sequence: index + 1,
    status: "UNKNOWN",
  }));
  return (
    <div className="rail" aria-label="Customer journey">
      {stages.map((stage) => {
        const status = stageStatus(stage.status, pending);
        const evidence = snapshot?.evidence.filter((item) => item.stage === stage.name) ?? [];
        return (
          <div className="stage" data-status={status} key={stage.id}>
            <div className="stage-name">
              {stage.name}
              {!quiet && <span className="status-word">{status}</span>}
            </div>
            {!quiet && (
              <div className="chips">
                {evidence.map((item) => (
                  <button key={item.id} className="chip" data-kind={chipKind(item)} onClick={() => onEvidence(item.id)}>
                    <small>{item.provenance_label}</small>
                    {item.summary}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Skeptic({
  snapshot,
  focusId,
  evaluating,
  onEvidence,
}: {
  snapshot: GraphSnapshot;
  focusId: string;
  evaluating: boolean;
  onEvidence: (id: string) => void;
}) {
  const focus = snapshot.findings.find((item) => item.id === focusId);
  if (!focus) return null;
  const index = DEMO_FINDING_ORDER.indexOf(focusId);
  const evidenceById = new Map(snapshot.evidence.map((item) => [item.id, item]));
  const supporting = focus.supporting_evidence_ids.map((id) => evidenceById.get(id)).filter((item): item is Evidence => Boolean(item));
  const counter = focus.counter_evidence_ids.map((id) => evidenceById.get(id)).filter((item): item is Evidence => Boolean(item));
  const shown = focus.verdict && !evaluating ? focus.verdict.verdict : "CHALLENGED";
  return (
    <section className="skeptic">
      <header>
        <span>Skeptic · {index + 1} of {DEMO_FINDING_ORDER.length}</span>
        <span>{shown === "CHALLENGED" ? "Challenging" : shown.replaceAll("_", " ")}</span>
      </header>
      <div className={shown === "REJECTED" ? "receded" : ""}>
        <h2 className="finding-title">{focus.title}</h2>
        <div className="columns">
          <div>
            <h3>Supporting evidence</h3>
            {supporting.map((item) => (
              <article key={item.id}>
                <button className="chip" data-kind={chipKind(item)} onClick={() => onEvidence(item.id)}>
                  <small>{item.provenance_label}</small>
                  {item.summary}
                </button>
              </article>
            ))}
          </div>
          <div>
            <h3>Counterevidence</h3>
            {counter.map((item) => (
              <article key={item.id}>
                <button className="chip" data-kind={chipKind(item)} onClick={() => onEvidence(item.id)}>
                  <small>{item.provenance_label}</small>
                  {item.summary}
                </button>
              </article>
            ))}
          </div>
        </div>
        <div className="unknowns">
          <h3>Unknowns</h3>
          <ul>{focus.unknowns.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <p className="warning">{snapshot.meta.coverage_warning}</p>
        {evaluating && <p className="evaluating">Skeptic evaluating...</p>}
        {focus.verdict && !evaluating && (
          <div className="verdict" data-verdict={focus.verdict.verdict}>
            <div className="verdict-label">
              {focus.verdict.verdict.replaceAll("_", " ")}
              {focus.verdict.verdict === "REJECTED" ? " · Insufficient evidence" : ""}
            </div>
            <p className="reason">{focus.verdict.reason}</p>
            <p className="source-note">{sourceLabel(focus.verdict.reasoning_source)}</p>
          </div>
        )}
      </div>
      <div className="agents">
        {snapshot.findings.filter((item) => item.verdict && item.id !== focusId).map((item) => (
          <div key={item.id} className={item.status === "REJECTED" ? "receded" : ""}>
            <strong>{item.status.replaceAll("_", " ")}</strong>
            {item.title}
          </div>
        ))}
      </div>
    </section>
  );
}

function Fix({ snapshot, onMonitor, onWhy }: { snapshot: GraphSnapshot; onMonitor: () => void; onWhy: () => void }) {
  const action = snapshot.actions[0];
  const finding = snapshot.findings.find((item) => item.id === action?.finding_id);
  if (!action) {
    return <section className="fix"><h1>No action cleared.</h1><p className="lede">The Skeptic did not mark a finding action-ready.</p></section>;
  }
  return (
    <section className="fix">
      <div className="kicker">One intervention</div>
      <h1>Fix first</h1>
      <div className="field"><span>What to change</span><p>{action.what_to_change}</p></div>
      <div className="field"><span>Why this first</span><p>{action.why_first}</p></div>
      <div className="field"><span>Customer outcome</span><p>{action.customer_outcome}</p></div>
      <div className="field"><span>Business stage</span><p>{action.business_stage}</p></div>
      <div className="field"><span>What to measure next</span><p>{action.measurement_required}</p></div>
      {finding?.verdict && (
        <div className="field"><span>Counterevidence the Skeptic kept</span><p>{finding.verdict.reason}</p></div>
      )}
      <div className="impact">
        <div className="kicker">Revenue impact</div>
        <p>{snapshot.opportunity?.revenue_impact}</p>
        <p className="lede">{snapshot.opportunity?.revenue_impact_note}</p>
      </div>
      <div className="actions">
        <button className="primary" onClick={onMonitor}>Start monitoring</button>
        <button className="linkish" onClick={onWhy}>Why this?</button>
      </div>
    </section>
  );
}

function Monitor({ snapshot }: { snapshot: GraphSnapshot }) {
  const check = snapshot.monitors[0];
  const action = snapshot.actions[0];
  return (
    <section className="monitor">
      <div className="kicker">After the change</div>
      <h1>Monitor</h1>
      <p className="lede">{check?.question}</p>
      <div className="flow">
        <span>Baseline</span>
        <span>→</span>
        <span>Intervention</span>
        <span>→</span>
        <span>New evidence</span>
        <span>→</span>
        <em>{(check?.status ?? "COLLECTING_EVIDENCE").replaceAll("_", " ")}</em>
      </div>
      <div className="field"><span>Baseline</span><p>{check?.baseline}</p></div>
      <div className="field"><span>Intervention</span><p>{action?.what_to_change}</p></div>
      <div className="field"><span>New evidence</span><p>{check?.current_value}</p></div>
      <p className="principle">Success is not whether the system finds a problem. Success is whether fixing an evidence-backed problem measurably improves the customer’s journey.</p>
      <div className="impact">
        <div className="kicker">Revenue impact</div>
        <p>UNQUANTIFIED</p>
        <p className="lede">{snapshot.meta.revenue_impact_note}</p>
      </div>
    </section>
  );
}

function Graph({
  snapshot,
  selected,
  onSelect,
  onBack,
}: {
  snapshot: GraphSnapshot;
  selected: string;
  onSelect: (value: string) => void;
  onBack: () => void;
}) {
  const rows: Array<{ id: string; depth: number; kind: string; label: string; detail: string }> = [];
  if (snapshot.business) {
    rows.push({ id: snapshot.business.id, depth: 0, kind: "Business", label: snapshot.business.name, detail: JSON.stringify(snapshot.business, null, 2) });
  }
  if (snapshot.opportunity) {
    rows.push({ id: snapshot.opportunity.id, depth: 1, kind: "Opportunity", label: snapshot.opportunity.mission, detail: JSON.stringify(snapshot.opportunity, null, 2) });
  }
  if (snapshot.mission) {
    rows.push({ id: snapshot.mission.id, depth: 2, kind: "Customer mission", label: snapshot.mission.statement, detail: JSON.stringify(snapshot.mission, null, 2) });
  }
  for (const stage of snapshot.stages) {
    rows.push({ id: stage.id, depth: 2, kind: "Journey stage", label: `${stage.name} · ${stage.status}`, detail: JSON.stringify(stage, null, 2) });
    for (const evidence of snapshot.evidence.filter((item) => item.stage === stage.name)) {
      rows.push({ id: evidence.id, depth: 3, kind: evidence.provenance_label, label: evidence.summary, detail: JSON.stringify(evidence, null, 2) });
    }
  }
  for (const finding of snapshot.findings) {
    rows.push({ id: finding.id, depth: 2, kind: `Finding · ${finding.status}`, label: finding.title, detail: JSON.stringify(finding, null, 2) });
    if (finding.verdict) {
      rows.push({ id: finding.verdict.jac_id, depth: 3, kind: "Skeptic verdict", label: finding.verdict.verdict, detail: JSON.stringify(finding.verdict, null, 2) });
    }
  }
  for (const action of snapshot.actions) {
    rows.push({ id: action.id, depth: 2, kind: "Action", label: action.title, detail: JSON.stringify(action, null, 2) });
  }
  for (const check of snapshot.monitors) {
    rows.push({ id: check.id, depth: 3, kind: "Monitor check", label: check.status, detail: JSON.stringify(check, null, 2) });
  }
  const detail = rows.find((row) => row.id === selected)?.detail ?? "Select a node. This is the opportunity graph the walkers are writing.";
  return (
    <section className="graph">
      <button className="text-btn" onClick={onBack}>Back</button>
      <h1>Opportunity graph</h1>
      <p className="lede">Source: {snapshot.meta.engine === "jac" ? "Jac / Jaseci. Nodes and edges updated by walkers." : "Local fixture. Jac is not connected."}</p>
      <div className="tree">
        {rows.map((row) => (
          <button key={row.id} className="node-btn" data-depth={row.depth} onClick={() => onSelect(row.id)}>
            <small>{row.kind}</small>
            {row.label}
          </button>
        ))}
      </div>
      <pre className="detail">{detail}</pre>
    </section>
  );
}

function Drawer({ evidence, finding, onClose }: { evidence: Evidence; onClose: () => void; finding: GraphSnapshot["findings"][number] | null }) {
  return (
    <>
      <button className="drawer-back" aria-label="Close evidence" onClick={onClose} />
      <aside className="drawer">
        <button className="text-btn" onClick={onClose}>Close</button>
        <p className="kicker">{evidence.provenance_label}</p>
        <h2>Why this?</h2>
        <div className="field"><span>Observation</span><p>{evidence.summary}</p></div>
        <div className="field"><span>Claim</span><p>{evidence.claim_supported}</p></div>
        <div className="field"><span>Customer impact</span><p>{evidence.customer_outcome_impact.replaceAll("_", " ")}</p></div>
        <div className="field"><span>Business impact</span><p>{finding?.business_impact ?? "Revenue impact stays unquantified without first-party evidence."}</p></div>
        <div className="field"><span>Provenance</span><p>{evidence.source_type} · collected by {evidence.collected_by} · {evidence.observed_at}</p></div>
        {evidence.source_url && <p><a href={evidence.source_url} target="_blank" rel="noreferrer">{evidence.source_url}</a></p>}
        <div className="field"><span>Confidence</span><p>{evidence.confidence}</p></div>
        {finding?.verdict && (
          <>
            <div className="field"><span>Skeptic verdict</span><p>{finding.verdict.verdict} · {finding.verdict.reason}</p></div>
            <div className="field"><span>Missing evidence</span><p>{finding.verdict.missing_evidence.join(" ")}</p></div>
          </>
        )}
      </aside>
    </>
  );
}
