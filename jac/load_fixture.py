"""Load the deterministic demo fixture. No network. No secrets."""

import json
from pathlib import Path


def load() -> dict:
    path = Path(__file__).resolve().parents[1] / "fixture" / "oasis_demo.json"
    return json.loads(path.read_text(encoding="utf-8"))
