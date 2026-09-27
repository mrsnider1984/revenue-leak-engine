import fixture from "../../fixture/oasis_demo.json";
import type { Evidence, Finding, GraphSnapshot } from "./types";

type FixtureEvidence = (typeof fixture.evidence)[number];

function evidenceFrom(item: FixtureEvidence): Evidence {
  return {
    jac_id: `local-${item.id}`,
    id: item.id,
    stage: item.stage,
    source_type: item.source_type,
    source_url: item.source_url,
    observed_at: item.observed_at,
    collected_by: item.collected_by,
    claim_supported: item.claim_supported,
    confidence: item.confidence,
    customer_outcome_impact: item.customer_outcome_impact,
    provenance_label: item.provenance_label,
    summary: item.summary,
  };
}

export function initialLocal(): GraphSnapshot {
  return {
    meta: {
      engine: "local_fixture",
      empty: false,
      skeptic_status: "not_configured",
      coverage_warning: fixture.coverage_warning,
      revenue_impact_note: fixture.revenue_impact_note,
      last_walker: "reset_demo",
    },
    business: { jac_id: "local-business", ...fixture.business },
    opportunity: {
      jac_id: "local-opportunity",
      id: fixture.opportunity.id,
      business_id: fixture.business.id,
      mission: fixture.opportunity.mission,
      current_stage: "DISCOVER",
      status: "OPEN",
      confidence: 0,
      revenue_impact: fixture.opportunity.revenue_impact,
      revenue_impact_note: fixture.revenue_impact_note,
    },
    mission: { jac_id: "local-mission", ...fixture.mission },
    stages: fixture.stages.map((name, index) => ({
      jac_id: `local-stage-${name}`,
      id: `stage-${name}`,
      name,
      sequence: index + 1,
      status: "UNKNOWN",
    })),
    evidence: [],
    findings: [],
    actions: [],
    monitors: [],
    agent_runs: [ran("reset_demo", "Local fixture reset. Not a live Jac graph.")],
  };
}

function ran(agent: string, note: string) {
  return {
    jac_id: `local-run-${agent}`, id: `run-${agent}`, agent, opportunity_id: fixture.opportunity.id,
    status: "completed", started_at: "2026-09-27", completed_at: "2026-09-27", note,
  };
}

function withEvidence(snapshot: GraphSnapshot, collector: string): GraphSnapshot {
  const have = new Set(snapshot.evidence.map((item) => item.id));
  const added = fixture.evidence.filter((item) => item.collected_by === collector && !have.has(item.id));
  return { ...snapshot, evidence: [...snapshot.evidence, ...added.map(evidenceFrom)] };
}

function candidateFindings(): Finding[] {
  return fixture.findings.map((item) => ({
    jac_id: `local-${item.id}`,
    id: item.id,
    title: item.title,
    status: "CANDIDATE",
    supporting_evidence_ids: item.supporting_evidence_ids,
    counter_evidence_ids: item.counter_evidence_ids,
    unknowns: item.unknowns,
    confidence: item.confidence,
    customer_impact: item.customer_impact,
    business_impact: item.business_impact,
    verdict: null,
  }));
}

export function applyLocal(current: GraphSnapshot, name: string, body: Record<string, string> = {}): GraphSnapshot {
  if (name === "reset_demo" || name === "get_opportunity") {
    return name === "get_opportunity" && current.business ? current : initialLocal();
  }
  const next: GraphSnapshot = structuredClone(current);
  if (!next.opportunity) return initialLocal();
  next.meta.last_walker = name;
  next.meta.engine = "local_fixture";

  if (name === "undercover_walk") {
    next.stages = next.stages.map((stage) => ({
      ...stage,
      status: fixture.stage_plan[stage.name as keyof typeof fixture.stage_plan] ?? stage.status,
    }));
    const withEv = withEvidence(next, "undercover_walk");
    next.evidence = withEv.evidence;
    next.opportunity.current_stage = "BOOK";
    next.opportunity.status = "INVESTIGATING";
    next.agent_runs.push(ran("undercover_walk", "Examining the customer journey."));
  }

  if (name === "market_walk") {
    next.evidence = withEvidence(next, "market_walk").evidence;
    next.agent_runs.push(ran("market_walk", "Public evidence collected."));
  }

  if (name === "ops_walk") {
    next.evidence = withEvidence(next, "ops_walk").evidence;
    if (next.findings.length === 0) next.findings = candidateFindings();
    next.agent_runs.push(ran("ops_walk", "Examining simulated handoff."));
  }

  if (name === "skeptic_operator_walk") {
    const findingId = body.finding_id;
    const source = fixture.findings.find((item) => item.id === findingId);
    next.findings = next.findings.map((finding) => {
      if (finding.id !== findingId || !source) return finding;
      const updated: Finding = {
        ...finding,
        status: source.verdict.verdict,
        confidence: source.verdict.confidence,
        verdict: {
          jac_id: `local-verdict-${finding.id}`,
          finding_id: finding.id,
          verdict: source.verdict.verdict,
          confidence: source.verdict.confidence,
          reason: source.verdict.reason,
          missing_evidence: source.verdict.missing_evidence,
          recommended_next_test: source.verdict.recommended_next_test,
          reasoning_source: "local_fixture",
          note: "",
        },
      };
      return updated;
    });
    if (source?.verdict.verdict === "ACTION_READY" && fixture.action.finding_id === findingId) {
      next.actions = [
        {
          jac_id: "local-action",
          ...fixture.action,
          opportunity_id: next.opportunity.id,
        },
      ];
      next.opportunity.status = "ACTION_READY";
      next.opportunity.confidence = source.verdict.confidence;
      next.opportunity.current_stage = fixture.action.business_stage;
    }
  }

  if (name === "start_monitoring" && next.actions[0]) {
    next.actions[0].status = "MONITORING";
    next.opportunity.status = "MONITORING";
    next.monitors = [
      {
        jac_id: "local-monitor",
        opportunity_id: next.opportunity.id,
        ...fixture.monitor,
      },
    ];
  }

  return next;
}
