#!/usr/bin/env python3
"""Print the Jac share of implementation code.

GitHub Linguist does not currently classify .jac, so the language bar is
not the measurement. This script counts source bytes.

Excluded from the denominator: vendor trees, the graph database, markdown,
the JSON fixture, pitch and docs, and package-lock files.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".venv", "node_modules", "dist", ".jac", "__pycache__", ".git"}
DOC_ROOTS = {"fixture", "docs"}
CODE_SUFFIXES = {".jac", ".py", ".ts", ".tsx", ".css", ".html", ".js"}


def included(path: Path) -> bool:
    if any(part in SKIP_DIRS for part in path.parts):
        return False
    rel = path.relative_to(ROOT)
    if rel.parts[0] in DOC_ROOTS:
        return False
    if path.suffix == ".md" or path.name in {"pitch.html", "package-lock.json"}:
        return False
    return path.suffix in CODE_SUFFIXES


def main() -> None:
    totals: dict[str, int] = {}
    files: list[tuple[int, str]] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or not included(path):
            continue
        size = path.stat().st_size
        totals[path.suffix] = totals.get(path.suffix, 0) + size
        files.append((size, str(path.relative_to(ROOT))))
    jac = totals.get(".jac", 0)
    total = sum(totals.values())
    share = (jac / total * 100) if total else 0
    print(f"Jac bytes: {jac}")
    print(f"Implementation bytes: {total}")
    print(f"Jac share: {share:.1f}%")
    print("By extension:")
    for suffix, size in sorted(totals.items(), key=lambda item: -item[1]):
        print(f"  {suffix:6} {size:7}  {size / total * 100:5.1f}%")
    if share < 40:
        raise SystemExit("Jac share is under 40%")


if __name__ == "__main__":
    main()
