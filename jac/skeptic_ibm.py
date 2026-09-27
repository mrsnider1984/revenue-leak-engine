"""Skeptic boundary.

Live IBM Granite runs only when IBM_API_KEY and IBM_PROJECT_ID are set.
Otherwise the walker receives a deterministic verdict and a source label.
A failed live call never masquerades as a model result.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from load_fixture import load

ALLOWED = {"REJECTED", "HYPOTHESIS", "ACTION_READY"}


def _load_env() -> None:
    path = Path(__file__).resolve().parents[1] / ".env"
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and value and key not in os.environ:
            os.environ[key] = value


def _redact(text: str) -> str:
    key = os.environ.get("IBM_API_KEY", "")
    if key:
        text = text.replace(key, "[redacted]")
    return text[:240]


def skeptic_status() -> str:
    _load_env()
    if os.environ.get("IBM_API_KEY") and os.environ.get("IBM_PROJECT_ID"):
        return "configured"
    return "not_configured"


def _finding(finding_id: str) -> dict:
    for item in load()["findings"]:
        if item["id"] == finding_id:
            return item
    raise KeyError(finding_id)


def _deterministic(finding_id: str, source: str, note: str = "") -> dict:
    verdict = _finding(finding_id)["verdict"]
    out = {
        "verdict": verdict["verdict"],
        "confidence": verdict["confidence"],
        "reason": verdict["reason"],
        "missing_evidence": list(verdict["missing_evidence"]),
        "recommended_next_test": verdict["recommended_next_test"],
        "reasoning_source": source,
    }
    if note:
        out["note"] = note
    return out


def _evidence_text(ids: list[str]) -> list[str]:
    wanted = set(ids)
    lines = []
    for item in load()["evidence"]:
        if item["id"] in wanted:
            lines.append(
                f"{item['id']} [{item['provenance_label']} / {item['source_type']}]: {item['summary']}"
            )
    return lines


def _token(api_key: str) -> str:
    body = urllib.parse.urlencode(
        {
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": api_key,
        }
    ).encode()
    req = urllib.request.Request(
        "https://iam.cloud.ibm.com/identity/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        payload = json.loads(resp.read().decode())
    token = payload.get("access_token", "")
    if not token:
        raise RuntimeError("IBM token response had no access_token")
    return token


def _parse_model_json(text: str) -> dict:
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < start:
        raise ValueError("model did not return JSON")
    data = json.loads(text[start : end + 1])
    verdict = str(data.get("verdict", "")).strip()
    if verdict not in ALLOWED:
        raise ValueError("model verdict was not an allowed value")
    missing = data.get("missingEvidence", data.get("missing_evidence", []))
    if not isinstance(missing, list):
        missing = [str(missing)]
    return {
        "verdict": verdict,
        "confidence": float(data.get("confidence", 0)),
        "reason": str(data.get("reason", "")).strip(),
        "missing_evidence": [str(item) for item in missing],
        "recommended_next_test": str(
            data.get("recommendedNextTest", data.get("recommended_next_test", ""))
        ).strip(),
        "reasoning_source": "ibm_granite",
    }


def _call_granite(finding: dict) -> dict:
    _load_env()
    api_key = os.environ["IBM_API_KEY"]
    project_id = os.environ["IBM_PROJECT_ID"]
    region = os.environ.get("IBM_REGION", "us-south")
    model_id = os.environ.get("IBM_MODEL", "ibm/granite-3-3-8b-instruct")
    token = _token(api_key)
    evidence = load()["evidence"]
    by_id = {item["id"]: item for item in evidence}
    supporting = [
        by_id[i]["summary"] for i in finding["supporting_evidence_ids"] if i in by_id
    ]
    counter = [
        by_id[i]["summary"] for i in finding["counter_evidence_ids"] if i in by_id
    ]
    user = {
        "finding": finding["title"],
        "supporting_evidence": supporting,
        "counterevidence": counter,
        "unknowns": finding["unknowns"],
        "coverage_warning": load()["coverage_warning"],
        "instruction": (
            "Decide only from the evidence given. Do not invent revenue. "
            "Do not treat inconvenience as proven loss. "
            "ACTION_READY means one change is worth testing, not that loss is proven."
        ),
    }
    body = json.dumps(
        {
            "model_id": model_id,
            "project_id": project_id,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are the Skeptic for one customer opportunity. "
                        "Return only JSON with keys verdict, confidence, reason, "
                        "missingEvidence, recommendedNextTest. "
                        "verdict must be REJECTED, HYPOTHESIS, or ACTION_READY."
                    ),
                },
                {"role": "user", "content": json.dumps(user)},
            ],
            "max_tokens": 500,
            "temperature": 0,
        }
    ).encode()
    url = f"https://{region}.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29"
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.loads(resp.read().decode())
    content = payload["choices"][0]["message"]["content"]
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part) for part in content
        )
    parsed = _parse_model_json(str(content))
    if not parsed["reason"]:
        raise ValueError("model reason was empty")
    return parsed


def challenge_finding(finding_id: str) -> dict:
    """Return a structured verdict. Jac writes this onto the graph."""
    try:
        _finding(finding_id)
    except KeyError:
        return {
            "verdict": "REJECTED",
            "confidence": 0.0,
            "reason": "That finding is not in the opportunity graph.",
            "missing_evidence": ["A known finding id."],
            "recommended_next_test": "Reset the demo and investigate again.",
            "reasoning_source": "deterministic_rules",
        }
    if skeptic_status() != "configured":
        return _deterministic(finding_id, "deterministic_rules")
    try:
        return _call_granite(_finding(finding_id))
    except (urllib.error.URLError, TimeoutError, KeyError, ValueError, json.JSONDecodeError, RuntimeError) as exc:
        fallback = _deterministic(finding_id, "deterministic_fallback", _redact(exc))
        return fallback
