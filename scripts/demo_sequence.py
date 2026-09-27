"""Run the judge path against the live Jac server and assert graph state."""

import json
import urllib.request

BASE = "http://127.0.0.1:8000"


def spawn(name: str, body: dict | None = None) -> dict:
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(
        f"{BASE}/walker/{name}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode())
    if not payload.get("ok"):
        raise SystemExit(f"{name} failed: {payload}")
    reports = payload["data"]["reports"]
    if not reports:
        raise SystemExit(f"{name} returned no report")
    return reports[0]


def main() -> None:
    snap = spawn("reset_demo")
    assert snap["business"]["name"] == "Oasis Hot Tub Gardens"
    assert all(stage["status"] == "UNKNOWN" for stage in snap["stages"])
    assert snap["evidence"] == []
    assert snap["meta"]["engine"] == "jac"

    snap = spawn("undercover_walk")
    by_name = {stage["name"]: stage["status"] for stage in snap["stages"]}
    assert by_name["BOOK"] == "FRICTION"
    assert by_name["ARRIVE"] == "UNKNOWN"
    assert any(ev["collected_by"] == "undercover_walk" for ev in snap["evidence"])

    snap = spawn("market_walk")
    assert any(ev["provenance_label"] == "PUBLIC EVIDENCE" for ev in snap["evidence"])

    snap = spawn("ops_walk")
    assert any(ev["source_type"] == "SIMULATED_BUSINESS_DATA" for ev in snap["evidence"])
    assert len(snap["findings"]) == 3
    assert all(f["status"] == "CANDIDATE" for f in snap["findings"])

    snap = spawn("skeptic_operator_walk", {"finding_id": "finding-price"})
    price = next(f for f in snap["findings"] if f["id"] == "finding-price")
    assert price["status"] == "REJECTED"
    assert price["verdict"]["verdict"] == "REJECTED"
    assert price["verdict"]["reasoning_source"] in {"deterministic_rules", "ibm_granite", "deterministic_fallback"}

    snap = spawn("skeptic_operator_walk", {"finding_id": "finding-room-time"})
    room = next(f for f in snap["findings"] if f["id"] == "finding-room-time")
    assert room["status"] == "HYPOTHESIS"

    snap = spawn("skeptic_operator_walk", {"finding_id": "finding-confirm"})
    confirm = next(f for f in snap["findings"] if f["id"] == "finding-confirm")
    assert confirm["status"] == "ACTION_READY"
    assert snap["actions"], "expected one action"
    assert snap["opportunity"]["revenue_impact"] == "UNQUANTIFIED"
    assert "2500" not in json.dumps(snap)

    snap = spawn("start_monitoring")
    assert snap["monitors"][0]["status"] == "COLLECTING_EVIDENCE"
    assert snap["opportunity"]["status"] == "MONITORING"

    snap = spawn("reset_demo")
    assert snap["findings"] == []
    print("demo sequence ok")
    print("skeptic", price["verdict"]["reasoning_source"])


if __name__ == "__main__":
    main()
