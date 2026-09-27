"""Revenue Leak Engine opportunity graph.

Walkers traverse one Opportunity and write evidence, findings, verdicts,
actions, and monitor checks back onto the graph.
"""

import from load_fixture { load }
import from skeptic_ibm { challenge_finding, skeptic_status }

node Business {
    has id: str;
    has name: str;
    has city: str;
    has address: str;
}

node Opportunity {
    has id: str;
    has business_id: str;
    has mission: str;
    has current_stage: str;
    has status: str;
    has confidence: float;
    has revenue_impact: str;
    has revenue_impact_note: str;
    has last_walker: str = "";
}

node CustomerMission {
    has id: str;
    has statement: str;
    has supporting: str;
}

node JourneyStage {
    has id: str;
    has opportunity_id: str;
    has name: str;
    has sequence: int;
    has status: str;
}

node Evidence {
    has id: str;
    has opportunity_id: str;
    has stage: str;
    has source_type: str;
    has source_url: str;
    has observed_at: str;
    has collected_by: str;
    has claim_supported: str;
    has confidence: float;
    has customer_outcome_impact: str;
    has provenance_label: str;
    has summary: str;
}

node Finding {
    has id: str;
    has opportunity_id: str;
    has title: str;
    has status: str;
    has unknowns: list[str] = [];
    has confidence: float = 0.0;
    has customer_impact: str = "";
    has business_impact: str = "";
}

node SkepticVerdict {
    has finding_id: str;
    has verdict: str;
    has confidence: float;
    has reason: str;
    has recommended_next_test: str;
    has reasoning_source: str;
    has missing_evidence: list[str] = [];
    has note: str = "";
}

node Action {
    has id: str;
    has opportunity_id: str;
    has finding_id: str;
    has title: str;
    has reason: str;
    has what_to_change: str;
    has why_first: str;
    has customer_outcome: str;
    has business_stage: str;
    has measurement_required: str;
    has status: str;
}

node MonitorCheck {
    has id: str;
    has opportunity_id: str;
    has action_id: str;
    has metric: str;
    has question: str;
    has baseline: str;
    has current_value: str;
    has status: str;
}

node AgentRun {
    has id: str;
    has agent: str;
    has opportunity_id: str;
    has status: str;
    has started_at: str;
    has completed_at: str;
    has note: str;
}

edge Owns: Business --> Opportunity {}
edge HasMission: Opportunity --> CustomerMission {}
edge HasStage: Opportunity --> JourneyStage {}
edge HasEvidence: JourneyStage --> Evidence {}
edge HasFinding: Opportunity --> Finding {}
edge Supports: Finding --> Evidence {}
edge Counters: Finding --> Evidence {}
edge HasVerdict: Finding --> SkepticVerdict {}
edge HasAction: Finding --> Action {}
edge HasMonitor: Action --> MonitorCheck {}
edge Ran: Opportunity --> AgentRun {}

def find_business() -> Business | None {
    found = [root -->][?:Business];
    if found {
        return found[0];
    }
    return None;
}

def find_opportunity() -> Opportunity | None {
    biz = find_business();
    if biz == None {
        return None;
    }
    found = [biz ->:Owns:->];
    if found {
        return found[0];
    }
    return None;
}

def find_stage(name: str) -> JourneyStage | None {
    opp = find_opportunity();
    if opp == None {
        return None;
    }
    for stage in [opp ->:HasStage:->] {
        if stage.name == name {
            return stage;
        }
    }
    return None;
}

def find_evidence(evidence_id: str) -> Evidence | None {
    opp = find_opportunity();
    if opp == None {
        return None;
    }
    for stage in [opp ->:HasStage:->] {
        for ev in [stage ->:HasEvidence:->] {
            if ev.id == evidence_id {
                return ev;
            }
        }
    }
    return None;
}

def find_finding(finding_id: str) -> Finding | None {
    opp = find_opportunity();
    if opp == None {
        return None;
    }
    for finding in [opp ->:HasFinding:->] {
        if finding.id == finding_id {
            return finding;
        }
    }
    return None;
}

def wipe() -> None {
    doomed = [root -->];
    for node_ref in doomed {
        del node_ref;
    }
}

def str_list(value: any) -> list[str] {
    rows: list[str] = [];
    for item in value as list {
        rows.append(item as str);
    }
    return rows;
}

def record_run(agent: str, note: str) -> None {
    opp = find_opportunity();
    if opp == None {
        return;
    }
    for run in [opp ->:Ran:->] {
        if run.agent == agent {
            run.status = "completed";
            run.completed_at = "2026-09-27";
            run.note = note;
            return;
        }
    }
    run = AgentRun(
        id="run-" + agent,
        agent=agent,
        opportunity_id=opp.id,
        status="completed",
        started_at="2026-09-27",
        completed_at="2026-09-27",
        note=note,
    );
    opp +>:Ran:+> run;
}

def seed_graph() -> None {
    data = load();
    biz_d = data["business"];
    mission_d = data["mission"];
    opp_d = data["opportunity"];
    biz = Business(
        id=biz_d["id"] as str,
        name=biz_d["name"] as str,
        city=biz_d["city"] as str,
        address=biz_d["address"] as str,
    );
    root ++> biz;
    opp = Opportunity(
        id=opp_d["id"] as str,
        business_id=biz.id,
        mission=opp_d["mission"] as str,
        current_stage="DISCOVER",
        status="OPEN",
        confidence=0.0,
        revenue_impact=opp_d["revenue_impact"] as str,
        revenue_impact_note=data["revenue_impact_note"] as str,
        last_walker="reset_demo",
    );
    biz +>:Owns:+> opp;
    mission = CustomerMission(
        id=mission_d["id"] as str,
        statement=mission_d["statement"] as str,
        supporting=mission_d["supporting"] as str,
    );
    opp +>:HasMission:+> mission;
    sequence: int = 0;
    for name_any in data["stages"] as list {
        sequence = sequence + 1;
        stage_name = name_any as str;
        stage = JourneyStage(
            id="stage-" + stage_name,
            opportunity_id=opp.id,
            name=stage_name,
            sequence=sequence,
            status="UNKNOWN",
        );
        opp +>:HasStage:+> stage;
    }
}

def attach_collected_by(walker_name: str) -> int {
    data = load();
    opp = find_opportunity();
    if opp == None {
        return 0;
    }
    added: int = 0;
    for item in data["evidence"] as list {
        collector = item["collected_by"] as str;
        if collector != walker_name {
            continue;
        }
        evidence_id = item["id"] as str;
        if find_evidence(evidence_id) != None {
            continue;
        }
        stage = find_stage(item["stage"] as str);
        if stage == None {
            continue;
        }
        ev = Evidence(
            id=evidence_id,
            opportunity_id=opp.id,
            stage=item["stage"] as str,
            source_type=item["source_type"] as str,
            source_url=item["source_url"] as str,
            observed_at=item["observed_at"] as str,
            collected_by=collector,
            claim_supported=item["claim_supported"] as str,
            confidence=item["confidence"] as float,
            customer_outcome_impact=item["customer_outcome_impact"] as str,
            provenance_label=item["provenance_label"] as str,
            summary=item["summary"] as str,
        );
        stage +>:HasEvidence:+> ev;
        added = added + 1;
    }
    return added;
}

def propose_findings() -> None {
    data = load();
    opp = find_opportunity();
    if opp == None {
        return;
    }
    for item in data["findings"] as list {
        finding_id = item["id"] as str;
        if find_finding(finding_id) != None {
            continue;
        }
        finding = Finding(
            id=finding_id,
            opportunity_id=opp.id,
            title=item["title"] as str,
            status="CANDIDATE",
            unknowns=str_list(item["unknowns"]),
            confidence=item["confidence"] as float,
            customer_impact=item["customer_impact"] as str,
            business_impact=item["business_impact"] as str,
        );
        opp +>:HasFinding:+> finding;
        for evidence_id in str_list(item["supporting_evidence_ids"]) {
            ev = find_evidence(evidence_id);
            if ev != None {
                finding +>:Supports:+> ev;
            }
        }
        for evidence_id in str_list(item["counter_evidence_ids"]) {
            ev = find_evidence(evidence_id);
            if ev != None {
                finding +>:Counters:+> ev;
            }
        }
    }
}

def apply_stage_plan() -> None {
    data = load();
    plan = data["stage_plan"];
    opp = find_opportunity();
    if opp == None {
        return;
    }
    for stage in [opp ->:HasStage:->] {
        stage.status = plan[stage.name] as str;
    }
    opp.current_stage = "BOOK";
    opp.status = "INVESTIGATING";
}

def ensure_action(finding: Finding, recommended: str) -> None {
    if [finding ->:HasAction:->] {
        return;
    }
    data = load();
    action_d = data["action"];
    opp = find_opportunity();
    opportunity_id = finding.opportunity_id;
    if opp != None {
        opportunity_id = opp.id;
    }
    action: Action;
    if finding.id == (action_d["finding_id"] as str) {
        action = Action(
            id=action_d["id"] as str,
            opportunity_id=opportunity_id,
            finding_id=finding.id,
            title=action_d["title"] as str,
            reason=action_d["reason"] as str,
            what_to_change=action_d["what_to_change"] as str,
            why_first=action_d["why_first"] as str,
            customer_outcome=action_d["customer_outcome"] as str,
            business_stage=action_d["business_stage"] as str,
            measurement_required=action_d["measurement_required"] as str,
            status="READY",
        );
    } else {
        action = Action(
            id="action-" + finding.id,
            opportunity_id=opportunity_id,
            finding_id=finding.id,
            title=recommended,
            reason=recommended,
            what_to_change=recommended,
            why_first="The Skeptic marked this finding action-ready.",
            customer_outcome="Less uncertainty at the stage under test.",
            business_stage="CONFIRM",
            measurement_required=recommended,
            status="READY",
        );
    }
    finding +>:HasAction:+> action;
    if opp != None {
        opp.status = "ACTION_READY";
        opp.confidence = finding.confidence;
        opp.current_stage = action.business_stage;
    }
}

def apply_skeptic(finding_id: str) -> None {
    finding = find_finding(finding_id);
    if finding == None {
        return;
    }
    result = challenge_finding(finding_id);
    verdict_name = result["verdict"] as str;
    reason = result["reason"] as str;
    recommended = result["recommended_next_test"] as str;
    source = result["reasoning_source"] as str;
    note = "";
    if "note" in result {
        note = result["note"] as str;
    }
    missing = str_list(result["missing_evidence"]);
    for old in [finding ->:HasVerdict:->] {
        del old;
    }
    verdict = SkepticVerdict(
        finding_id=finding.id,
        verdict=verdict_name,
        confidence=result["confidence"] as float,
        reason=reason,
        missing_evidence=missing,
        recommended_next_test=recommended,
        reasoning_source=source,
        note=note,
    );
    finding +>:HasVerdict:+> verdict;
    finding.status = verdict_name;
    finding.confidence = verdict.confidence;
    if verdict_name == "ACTION_READY" {
        ensure_action(finding, recommended);
    } else {
        for old_action in [finding ->:HasAction:->] {
            for mon in [old_action ->:HasMonitor:->] {
                del mon;
            }
            del old_action;
        }
    }
    record_run("skeptic_operator_walk", verdict_name + " · " + source + " · " + finding.id);
    opp = find_opportunity();
    if opp != None {
        opp.last_walker = "skeptic_operator_walk";
    }
}

def evidence_payload(ev: Evidence) -> dict {
    return {
        "jac_id": jid(ev),
        "id": ev.id,
        "stage": ev.stage,
        "source_type": ev.source_type,
        "source_url": ev.source_url,
        "observed_at": ev.observed_at,
        "collected_by": ev.collected_by,
        "claim_supported": ev.claim_supported,
        "confidence": ev.confidence,
        "customer_outcome_impact": ev.customer_outcome_impact,
        "provenance_label": ev.provenance_label,
        "summary": ev.summary,
    };
}

def snapshot() -> dict {
    data = load();
    biz = find_business();
    opp = find_opportunity();
    meta = {
        "engine": "jac",
        "empty": biz == None,
        "skeptic_status": skeptic_status(),
        "coverage_warning": data["coverage_warning"] as str,
        "revenue_impact_note": data["revenue_impact_note"] as str,
        "last_walker": "",
    };
    if biz == None or opp == None {
        return {
            "meta": meta,
            "business": None,
            "opportunity": None,
            "mission": None,
            "stages": [],
            "evidence": [],
            "findings": [],
            "actions": [],
            "monitors": [],
            "agent_runs": [],
        };
    }
    meta["last_walker"] = opp.last_walker;
    mission = ([opp ->:HasMission:->][0] if [opp ->:HasMission:->] else None);
    stages: list[dict] = [];
    evidence: list[dict] = [];
    sequence: int = 1;
    while sequence <= 8 {
        for stage in [opp ->:HasStage:->] {
            if stage.sequence == sequence {
                stages.append({
                    "jac_id": jid(stage),
                    "id": stage.id,
                    "name": stage.name,
                    "sequence": stage.sequence,
                    "status": stage.status,
                });
                for ev in [stage ->:HasEvidence:->] {
                    evidence.append(evidence_payload(ev));
                }
            }
        }
        sequence = sequence + 1;
    }
    findings: list[dict] = [];
    actions: list[dict] = [];
    monitors: list[dict] = [];
    for finding in [opp ->:HasFinding:->] {
        support_ids: list[str] = [];
        counter_ids: list[str] = [];
        for ev in [finding ->:Supports:->] {
            support_ids.append(ev.id);
        }
        for ev in [finding ->:Counters:->] {
            counter_ids.append(ev.id);
        }
        verdict_payload = None;
        verdict_nodes = [finding ->:HasVerdict:->];
        if verdict_nodes {
            verdict = verdict_nodes[0];
            verdict_payload = {
                "jac_id": jid(verdict),
                "finding_id": verdict.finding_id,
                "verdict": verdict.verdict,
                "confidence": verdict.confidence,
                "reason": verdict.reason,
                "missing_evidence": verdict.missing_evidence,
                "recommended_next_test": verdict.recommended_next_test,
                "reasoning_source": verdict.reasoning_source,
                "note": verdict.note,
            };
        }
        findings.append({
            "jac_id": jid(finding),
            "id": finding.id,
            "title": finding.title,
            "status": finding.status,
            "supporting_evidence_ids": support_ids,
            "counter_evidence_ids": counter_ids,
            "unknowns": finding.unknowns,
            "confidence": finding.confidence,
            "customer_impact": finding.customer_impact,
            "business_impact": finding.business_impact,
            "verdict": verdict_payload,
        });
        for action in [finding ->:HasAction:->] {
            actions.append({
                "jac_id": jid(action),
                "id": action.id,
                "opportunity_id": action.opportunity_id,
                "finding_id": action.finding_id,
                "title": action.title,
                "reason": action.reason,
                "what_to_change": action.what_to_change,
                "why_first": action.why_first,
                "customer_outcome": action.customer_outcome,
                "business_stage": action.business_stage,
                "measurement_required": action.measurement_required,
                "status": action.status,
            });
            for mon in [action ->:HasMonitor:->] {
                monitors.append({
                    "jac_id": jid(mon),
                    "id": mon.id,
                    "opportunity_id": mon.opportunity_id,
                    "action_id": mon.action_id,
                    "metric": mon.metric,
                    "question": mon.question,
                    "baseline": mon.baseline,
                    "current_value": mon.current_value,
                    "status": mon.status,
                });
            }
        }
    }
    runs: list[dict] = [];
    for run in [opp ->:Ran:->] {
        runs.append({
            "jac_id": jid(run),
            "id": run.id,
            "agent": run.agent,
            "opportunity_id": run.opportunity_id,
            "status": run.status,
            "started_at": run.started_at,
            "completed_at": run.completed_at,
            "note": run.note,
        });
    }
    mission_payload = None;
    if mission != None {
        mission_payload = {
            "jac_id": jid(mission),
            "id": mission.id,
            "statement": mission.statement,
            "supporting": mission.supporting,
        };
    }
    return {
        "meta": meta,
        "business": {
            "jac_id": jid(biz),
            "id": biz.id,
            "name": biz.name,
            "city": biz.city,
            "address": biz.address,
        },
        "opportunity": {
            "jac_id": jid(opp),
            "id": opp.id,
            "business_id": opp.business_id,
            "mission": opp.mission,
            "current_stage": opp.current_stage,
            "status": opp.status,
            "confidence": opp.confidence,
            "revenue_impact": opp.revenue_impact,
            "revenue_impact_note": opp.revenue_impact_note,
        },
        "mission": mission_payload,
        "stages": stages,
        "evidence": evidence,
        "findings": findings,
        "actions": actions,
        "monitors": monitors,
        "agent_runs": runs,
    };
}

def mark(walker_name: str) -> None {
    opp = find_opportunity();
    if opp != None {
        opp.last_walker = walker_name;
    }
}

walker:pub reset_demo {
    can run with Root entry {
        wipe();
        seed_graph();
        record_run("reset_demo", "Opportunity graph reset to the demonstration fixture.");
        mark("reset_demo");
        report snapshot();
    }
}

walker:pub get_opportunity {
    can run with Root entry {
        if find_business() == None {
            seed_graph();
        }
        report snapshot();
    }
}

walker:pub undercover_walk {
    can run with Root entry {
        if find_business() == None {
            seed_graph();
        }
        apply_stage_plan();
        added = attach_collected_by("undercover_walk");
        record_run("undercover_walk", "Customer journey examined. Evidence attached: " + str(added));
        mark("undercover_walk");
        report snapshot();
    }
}

walker:pub market_walk {
    can run with Root entry {
        if find_business() == None {
            seed_graph();
        }
        added = attach_collected_by("market_walk");
        record_run("market_walk", "Public evidence collected. Records attached: " + str(added));
        mark("market_walk");
        report snapshot();
    }
}

walker:pub ops_walk {
    can run with Root entry {
        if find_business() == None {
            seed_graph();
        }
        added = attach_collected_by("ops_walk");
        propose_findings();
        record_run("ops_walk", "Simulated handoff examined. Records attached: " + str(added));
        mark("ops_walk");
        report snapshot();
    }
}

walker:pub skeptic_operator_walk {
    has finding_id: str = "";

    can run with Root entry {
        if find_business() == None {
            seed_graph();
        }
        apply_skeptic(self.finding_id);
        report snapshot();
    }
}

walker:pub start_monitoring {
    can run with Root entry {
        if find_business() == None {
            seed_graph();
        }
        data = load();
        mon_d = data["monitor"];
        opp = find_opportunity();
        if opp != None {
            for finding in [opp ->:HasFinding:->] {
                for action in [finding ->:HasAction:->] {
                    if not [action ->:HasMonitor:->] {
                        mon = MonitorCheck(
                            id=mon_d["id"] as str,
                            opportunity_id=opp.id,
                            action_id=action.id,
                            metric=mon_d["metric"] as str,
                            question=mon_d["question"] as str,
                            baseline=mon_d["baseline"] as str,
                            current_value=mon_d["current_value"] as str,
                            status=mon_d["status"] as str,
                        );
                        action +>:HasMonitor:+> mon;
                    }
                    action.status = "MONITORING";
                    opp.status = "MONITORING";
                    opp.current_stage = action.business_stage;
                }
            }
            opp.last_walker = "start_monitoring";
        }
        report snapshot();
    }
}
