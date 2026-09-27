export type StageStatus = "UNKNOWN" | "INVESTIGATING" | "PASS" | "FRICTION" | "CHALLENGED";
export type FindingStatus = "CANDIDATE" | "CHALLENGED" | "REJECTED" | "HYPOTHESIS" | "ACTION_READY";

export interface Evidence {
  jac_id: string;
  id: string;
  stage: string;
  source_type: string;
  source_url: string;
  observed_at: string;
  collected_by: string;
  claim_supported: string;
  confidence: number;
  customer_outcome_impact: string;
  provenance_label: string;
  summary: string;
}

export interface Verdict {
  jac_id: string;
  finding_id: string;
  verdict: string;
  confidence: number;
  reason: string;
  missing_evidence: string[];
  recommended_next_test: string;
  reasoning_source: string;
  note: string;
}

export interface Finding {
  jac_id: string;
  id: string;
  title: string;
  status: string;
  supporting_evidence_ids: string[];
  counter_evidence_ids: string[];
  unknowns: string[];
  confidence: number;
  customer_impact: string;
  business_impact: string;
  verdict: Verdict | null;
}

export interface ActionItem {
  jac_id: string;
  id: string;
  opportunity_id: string;
  finding_id: string;
  title: string;
  reason: string;
  what_to_change: string;
  why_first: string;
  customer_outcome: string;
  business_stage: string;
  measurement_required: string;
  status: string;
}

export interface MonitorCheck {
  jac_id: string;
  id: string;
  opportunity_id: string;
  action_id: string;
  metric: string;
  question: string;
  baseline: string;
  current_value: string;
  status: string;
}

export interface AgentRun {
  jac_id: string;
  id: string;
  agent: string;
  opportunity_id: string;
  status: string;
  started_at: string;
  completed_at: string;
  note: string;
}

export interface GraphSnapshot {
  meta: {
    engine: string;
    empty?: boolean;
    skeptic_status: string;
    coverage_warning: string;
    revenue_impact_note: string;
    last_walker: string;
  };
  business: { jac_id: string; id: string; name: string; city: string; address: string } | null;
  opportunity: {
    jac_id: string;
    id: string;
    business_id: string;
    mission: string;
    current_stage: string;
    status: string;
    confidence: number;
    revenue_impact: string;
    revenue_impact_note: string;
  } | null;
  mission: { jac_id: string; id: string; statement: string; supporting: string } | null;
  stages: Array<{ jac_id: string; id: string; name: string; sequence: number; status: string }>;
  evidence: Evidence[];
  findings: Finding[];
  actions: ActionItem[];
  monitors: MonitorCheck[];
  agent_runs: AgentRun[];
}

export const DEMO_FINDING_ORDER = ["finding-price", "finding-room-time", "finding-confirm"];

export function sourceLabel(source: string): string {
  if (source === "ibm_granite") return "Live IBM Granite";
  if (source === "deterministic_fallback") return "IBM call failed. Deterministic Skeptic rule used.";
  if (source === "local_fixture") return "Local fixture. The Jac server was not reachable.";
  return "Deterministic Skeptic rule. Not a live IBM call.";
}
