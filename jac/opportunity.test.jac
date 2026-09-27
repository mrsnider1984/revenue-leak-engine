"""Walker tests for the Oasis demonstration opportunity.

These tests spawn the same public walkers the React app calls.
Run after `jac clean --data` so a previous server graph cannot leak in.
"""

def snap_from(walker_name: str, finding_id: str) -> dict {
    if walker_name == "skeptic_operator_walk" {
        result = root spawn skeptic_operator_walk(finding_id=finding_id);
        return result.reports[0];
    }
    if walker_name == "undercover_walk" {
        result = root spawn undercover_walk();
        return result.reports[0];
    }
    if walker_name == "market_walk" {
        result = root spawn market_walk();
        return result.reports[0];
    }
    if walker_name == "ops_walk" {
        result = root spawn ops_walk();
        return result.reports[0];
    }
    if walker_name == "start_monitoring" {
        result = root spawn start_monitoring();
        return result.reports[0];
    }
    result = root spawn reset_demo();
    return result.reports[0];
}

def stage_status(snap: dict, name: str) -> str {
    for stage in snap["stages"] {
        if stage["name"] == name {
            return stage["status"];
        }
    }
    return "";
}

def evidence_ids(snap: dict) -> list[str] {
    ids: list[str] = [];
    for item in snap["evidence"] {
        ids.append(item["id"]);
    }
    return ids;
}

def finding_by_id(snap: dict, finding_id: str) -> dict {
    for finding in snap["findings"] {
        if finding["id"] == finding_id {
            return finding;
        }
    }
    return {};
}

test "reset seeds one opportunity and an unknown journey" {
    snap = snap_from("reset_demo", "");
    assert snap["meta"]["engine"] == "jac";
    assert snap["business"]["name"] == "Oasis Hot Tub Gardens";
    assert snap["business"]["city"] == "Ann Arbor, Michigan";
    assert snap["mission"]["statement"] == "I just want to decompress.";
    assert snap["opportunity"]["revenue_impact"] == "UNQUANTIFIED";
    assert len(snap["stages"]) == 8;
    assert stage_status(snap, "DISCOVER") == "UNKNOWN";
    assert stage_status(snap, "BOOK") == "UNKNOWN";
    assert stage_status(snap, "RETURN") == "UNKNOWN";
    assert len(snap["evidence"]) == 0;
    assert len(snap["findings"]) == 0;
    assert len(snap["actions"]) == 0;
    assert len(snap["monitors"]) == 0;
}

test "undercover marks booking friction and leaves later stages unknown" {
    snap_from("reset_demo", "");
    snap = snap_from("undercover_walk", "");
    assert stage_status(snap, "DISCOVER") == "PASS";
    assert stage_status(snap, "UNDERSTAND") == "PASS";
    assert stage_status(snap, "CHOOSE") == "PASS";
    assert stage_status(snap, "BOOK") == "FRICTION";
    assert stage_status(snap, "CONFIRM") == "FRICTION";
    assert stage_status(snap, "ARRIVE") == "UNKNOWN";
    assert stage_status(snap, "EXPERIENCE") == "UNKNOWN";
    assert stage_status(snap, "RETURN") == "UNKNOWN";
    assert "ev-scenario" in evidence_ids(snap);
    assert "ev-coverage" in evidence_ids(snap);
    assert "ev-request" not in evidence_ids(snap);
}

test "market walk attaches public evidence and not the simulated handoff" {
    snap = snap_from("market_walk", "");
    ids = evidence_ids(snap);
    assert "ev-homepage" in ids;
    assert "ev-rates" in ids;
    assert "ev-request" in ids;
    assert "ev-phone" in ids;
    assert "ev-sim-unconfirmed" not in ids;
    for item in snap["evidence"] {
        if item["id"] == "ev-request" {
            assert item["provenance_label"] == "PUBLIC OBSERVATION";
            assert item["source_type"] == "PUBLIC_OBSERVATION";
            assert "oasishottubs.com/reservations-2/" in item["source_url"];
        }
        if item["id"] == "ev-rates" {
            assert item["provenance_label"] == "PUBLIC EVIDENCE";
            assert "$44" in item["summary"];
            assert "$64" in item["summary"];
        }
    }
}

test "ops walk adds simulated handoff and three candidate findings" {
    snap = snap_from("ops_walk", "");
    found_sim = False;
    for item in snap["evidence"] {
        if item["id"] == "ev-sim-unconfirmed" {
            found_sim = True;
            assert item["source_type"] == "SIMULATED_BUSINESS_DATA";
            assert item["provenance_label"] == "SIMULATED BUSINESS DATA";
            assert "Not provided by Oasis" in item["summary"];
        }
    }
    assert found_sim;
    assert len(snap["findings"]) == 3;
    for finding in snap["findings"] {
        assert finding["status"] == "CANDIDATE";
        assert finding["verdict"] == None;
    }
}

test "skeptic rejects the price finding for insufficient evidence" {
    snap = snap_from("skeptic_operator_walk", "finding-price");
    finding = finding_by_id(snap, "finding-price");
    assert finding["status"] == "REJECTED";
    assert finding["verdict"]["verdict"] == "REJECTED";
    assert finding["verdict"]["reasoning_source"] in ["deterministic_rules", "ibm_granite", "deterministic_fallback"];
    assert "Insufficient evidence" in finding["verdict"]["reason"];
    assert len(snap["actions"]) == 0;
}

test "skeptic keeps the room-time finding as a hypothesis" {
    snap = snap_from("skeptic_operator_walk", "finding-room-time");
    finding = finding_by_id(snap, "finding-room-time");
    assert finding["status"] == "HYPOTHESIS";
    assert finding["verdict"]["verdict"] == "HYPOTHESIS";
    price = finding_by_id(snap, "finding-price");
    assert price["status"] == "REJECTED";
}

test "skeptic can clear one action without inventing revenue" {
    snap = snap_from("skeptic_operator_walk", "finding-confirm");
    finding = finding_by_id(snap, "finding-confirm");
    assert finding["status"] == "ACTION_READY";
    assert len(snap["actions"]) == 1;
    action = snap["actions"][0];
    assert action["finding_id"] == "finding-confirm";
    assert action["business_stage"] == "CONFIRM";
    assert action["status"] == "READY";
    assert snap["opportunity"]["revenue_impact"] == "UNQUANTIFIED";
    assert "first-party" in snap["opportunity"]["revenue_impact_note"];
    assert "phone" in snap["meta"]["coverage_warning"];
}

test "monitoring starts at collecting evidence and does not claim improvement" {
    snap = snap_from("start_monitoring", "");
    assert len(snap["monitors"]) == 1;
    mon = snap["monitors"][0];
    assert mon["status"] == "COLLECTING_EVIDENCE";
    assert mon["baseline"] == "Not measured. This demo has no Oasis baseline.";
    assert snap["opportunity"]["status"] == "MONITORING";
    assert snap["actions"][0]["status"] == "MONITORING";
    assert mon["status"] != "IMPROVED";
}

test "reset after the demo returns the journey to unknown" {
    snap = snap_from("reset_demo", "");
    assert len(snap["findings"]) == 0;
    assert len(snap["actions"]) == 0;
    assert len(snap["monitors"]) == 0;
    assert len(snap["evidence"]) == 0;
    assert stage_status(snap, "BOOK") == "UNKNOWN";
    assert stage_status(snap, "CONFIRM") == "UNKNOWN";
}
test "public and simulated evidence keep the labels the demo shows" {
    snap_from("reset_demo", "");
    snap_from("undercover_walk", "");
    snap_from("market_walk", "");
    snap = snap_from("ops_walk", "");
    by_id: dict = {};
    for item in snap["evidence"] {
        by_id[item["id"]] = item;
    }
    assert by_id["ev-scenario"]["source_type"] == "HYPOTHESIS";
    assert by_id["ev-scenario"]["provenance_label"] == "DEMONSTRATION SCENARIO";
    assert by_id["ev-scenario"]["collected_by"] == "undercover_walk";
    assert by_id["ev-scenario"]["stage"] == "DISCOVER";
    assert by_id["ev-scenario"]["customer_outcome_impact"] == "SUPPORTS_DECOMPRESSION";
    assert by_id["ev-scenario"]["observed_at"] == "2026-09-27";
    assert "The customer wants a simple private hour for two after a stressful week. This sc" in by_id["ev-scenario"]["summary"];
    assert by_id["ev-coverage"]["source_type"] == "UNKNOWN";
    assert by_id["ev-coverage"]["provenance_label"] == "COVERAGE GAP";
    assert by_id["ev-coverage"]["collected_by"] == "undercover_walk";
    assert by_id["ev-coverage"]["stage"] == "DISCOVER";
    assert by_id["ev-coverage"]["customer_outcome_impact"] == "UNKNOWN";
    assert by_id["ev-coverage"]["observed_at"] == "2026-09-27";
    assert "Phone, walk-in, referral, and accessibility-assisted journeys are not in this ev" in by_id["ev-coverage"]["summary"];
    assert by_id["ev-homepage"]["source_type"] == "PUBLIC_EVIDENCE";
    assert by_id["ev-homepage"]["provenance_label"] == "PUBLIC EVIDENCE";
    assert by_id["ev-homepage"]["collected_by"] == "market_walk";
    assert by_id["ev-homepage"]["stage"] == "UNDERSTAND";
    assert by_id["ev-homepage"]["customer_outcome_impact"] == "SUPPORTS_DECOMPRESSION";
    assert by_id["ev-homepage"]["observed_at"] == "2026-09-27";
    assert "Observed on the homepage: private garden rooms, a restorative visit, and the Ann" in by_id["ev-homepage"]["summary"];
    assert by_id["ev-room-time"]["source_type"] == "PUBLIC_EVIDENCE";
    assert by_id["ev-room-time"]["provenance_label"] == "PUBLIC EVIDENCE";
    assert by_id["ev-room-time"]["collected_by"] == "market_walk";
    assert by_id["ev-room-time"]["stage"] == "UNDERSTAND";
    assert by_id["ev-room-time"]["customer_outcome_impact"] == "ADDS_UNCERTAINTY";
    assert by_id["ev-room-time"]["observed_at"] == "2026-09-27";
    assert "Observed: room time includes changing and shower time. Whether that surprises an" in by_id["ev-room-time"]["summary"];
    assert by_id["ev-room-disclosed"]["source_type"] == "PUBLIC_OBSERVATION";
    assert by_id["ev-room-disclosed"]["provenance_label"] == "PUBLIC OBSERVATION";
    assert by_id["ev-room-disclosed"]["collected_by"] == "market_walk";
    assert by_id["ev-room-disclosed"]["stage"] == "UNDERSTAND";
    assert by_id["ev-room-disclosed"]["customer_outcome_impact"] == "SUPPORTS_DECOMPRESSION";
    assert by_id["ev-room-disclosed"]["observed_at"] == "2026-09-27";
    assert "The rule is stated publicly before arrival. This demo has no complaint or abando" in by_id["ev-room-disclosed"]["summary"];
    assert by_id["ev-rates"]["source_type"] == "PUBLIC_EVIDENCE";
    assert by_id["ev-rates"]["provenance_label"] == "PUBLIC EVIDENCE";
    assert by_id["ev-rates"]["collected_by"] == "market_walk";
    assert by_id["ev-rates"]["stage"] == "CHOOSE";
    assert by_id["ev-rates"]["customer_outcome_impact"] == "UNKNOWN";
    assert by_id["ev-rates"]["observed_at"] == "2026-09-27";
    assert "Observed on the rates page for Ann Arbor, up to 2 people: 1 hour is $44.00 for s" in by_id["ev-rates"]["summary"];
    assert by_id["ev-rates-published"]["source_type"] == "PUBLIC_OBSERVATION";
    assert by_id["ev-rates-published"]["provenance_label"] == "PUBLIC OBSERVATION";
    assert by_id["ev-rates-published"]["collected_by"] == "market_walk";
    assert by_id["ev-rates-published"]["stage"] == "CHOOSE";
    assert by_id["ev-rates-published"]["customer_outcome_impact"] == "SUPPORTS_DECOMPRESSION";
    assert by_id["ev-rates-published"]["observed_at"] == "2026-09-27";
    assert "A customer can see both prices before requesting a time. Publication alone does " in by_id["ev-rates-published"]["summary"];
    assert by_id["ev-no-price-stop"]["source_type"] == "UNKNOWN";
    assert by_id["ev-no-price-stop"]["provenance_label"] == "UNKNOWN";
    assert by_id["ev-no-price-stop"]["collected_by"] == "undercover_walk";
    assert by_id["ev-no-price-stop"]["stage"] == "BOOK";
    assert by_id["ev-no-price-stop"]["customer_outcome_impact"] == "UNKNOWN";
    assert by_id["ev-no-price-stop"]["observed_at"] == "2026-09-27";
    assert "There is no first-party funnel, price test, or abandonment record in this demo." in by_id["ev-no-price-stop"]["summary"];
    assert by_id["ev-request"]["source_type"] == "PUBLIC_OBSERVATION";
    assert by_id["ev-request"]["provenance_label"] == "PUBLIC OBSERVATION";
    assert by_id["ev-request"]["collected_by"] == "market_walk";
    assert by_id["ev-request"]["stage"] == "BOOK";
    assert by_id["ev-request"]["customer_outcome_impact"] == "ADDS_UNCERTAINTY";
    assert by_id["ev-request"]["observed_at"] == "2026-09-27";
    assert "Observed on the reservations page: the business uses Square Appointments; select" in by_id["ev-request"]["summary"];
    assert by_id["ev-request-disclosed"]["source_type"] == "PUBLIC_OBSERVATION";
    assert by_id["ev-request-disclosed"]["provenance_label"] == "PUBLIC OBSERVATION";
    assert by_id["ev-request-disclosed"]["collected_by"] == "market_walk";
    assert by_id["ev-request-disclosed"]["stage"] == "BOOK";
    assert by_id["ev-request-disclosed"]["customer_outcome_impact"] == "SUPPORTS_DECOMPRESSION";
    assert by_id["ev-request-disclosed"]["observed_at"] == "2026-09-27";
    assert "The rule is not hidden. This investigation did not observe whether the Square bo" in by_id["ev-request-disclosed"]["summary"];
    assert by_id["ev-phone"]["source_type"] == "PUBLIC_EVIDENCE";
    assert by_id["ev-phone"]["provenance_label"] == "PUBLIC EVIDENCE";
    assert by_id["ev-phone"]["collected_by"] == "market_walk";
    assert by_id["ev-phone"]["stage"] == "BOOK";
    assert by_id["ev-phone"]["customer_outcome_impact"] == "UNKNOWN";
    assert by_id["ev-phone"]["observed_at"] == "2026-09-27";
    assert "The reservations page says online requests can be made from 4 hours to 60 days a" in by_id["ev-phone"]["summary"];
    assert by_id["ev-sim-unconfirmed"]["source_type"] == "SIMULATED_BUSINESS_DATA";
    assert by_id["ev-sim-unconfirmed"]["provenance_label"] == "SIMULATED BUSINESS DATA";
    assert by_id["ev-sim-unconfirmed"]["collected_by"] == "ops_walk";
    assert by_id["ev-sim-unconfirmed"]["stage"] == "CONFIRM";
    assert by_id["ev-sim-unconfirmed"]["customer_outcome_impact"] == "BLOCKS_PROGRESS";
    assert by_id["ev-sim-unconfirmed"]["observed_at"] == "2026-09-27";
    assert "Demonstration only. Not provided by Oasis. Synthetic state: request submitted, s" in by_id["ev-sim-unconfirmed"]["summary"];
}
test "candidate findings match the three-way skeptic setup" {
    snap_from("reset_demo", "");
    snap_from("undercover_walk", "");
    snap_from("market_walk", "");
    snap = snap_from("ops_walk", "");
    by_id: dict = {};
    for finding in snap["findings"] {
        by_id[finding["id"]] = finding;
    }
    assert by_id["finding-price"]["title"] == "The evening price is why this opportunity stopped.";
    assert by_id["finding-price"]["status"] == "CANDIDATE";
    assert len(by_id["finding-price"]["unknowns"]) == 3;
    assert len(by_id["finding-price"]["supporting_evidence_ids"]) == 1;
    assert len(by_id["finding-price"]["counter_evidence_ids"]) == 2;
    assert by_id["finding-room-time"]["title"] == "The opportunity stopped because reserved time includes changing and showering.";
    assert by_id["finding-room-time"]["status"] == "CANDIDATE";
    assert len(by_id["finding-room-time"]["unknowns"]) == 3;
    assert len(by_id["finding-room-time"]["supporting_evidence_ids"]) == 1;
    assert len(by_id["finding-room-time"]["counter_evidence_ids"]) == 1;
    assert by_id["finding-confirm"]["title"] == "The customer can leave the booking step without a confirmed visit.";
    assert by_id["finding-confirm"]["status"] == "CANDIDATE";
    assert len(by_id["finding-confirm"]["unknowns"]) == 4;
    assert len(by_id["finding-confirm"]["supporting_evidence_ids"]) == 2;
    assert len(by_id["finding-confirm"]["counter_evidence_ids"]) == 2;
    assert by_id["finding-confirm"]["customer_impact"] == "The customer wants one hour to decompress, not an open question about whether that hour exists.";
}
