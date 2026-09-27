export const FINDING_STEPS = ["finding-price", "finding-room-time", "finding-confirm"] as const;
export const ORDER = [...FINDING_STEPS, "fix", "monitor"] as const;
export type Ordered = (typeof ORDER)[number];

const LABELS: Record<Ordered, string> = {
  "finding-price": "Finding 1 of 3",
  "finding-room-time": "Finding 2 of 3",
  "finding-confirm": "Finding 3 of 3",
  fix: "Fix First",
  monitor: "Monitor",
};

export function stepLabel(step: string): string {
  return step in LABELS ? LABELS[step as Ordered] : "";
}

export function move(step: string, dir: -1 | 1): Ordered | null {
  const index = ORDER.indexOf(step as Ordered);
  if (index < 0) return null;
  return ORDER[index + dir] ?? null;
}

export function stale(token: number, current: number): boolean {
  return token !== current;
}

export type Box = { top: number; right: number; bottom: number; left: number };

export function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function selfCheck() {
  const eq = (a: unknown, b: unknown) => { if (a !== b) throw new Error(String(a)); };
  eq(stepLabel("finding-price"), "Finding 1 of 3");
  eq(stepLabel("finding-room-time"), "Finding 2 of 3");
  eq(stepLabel("finding-confirm"), "Finding 3 of 3");
  eq(stepLabel("fix"), "Fix First");
  eq(stepLabel("monitor"), "Monitor");
  eq(stepLabel("collect"), "");
  eq(move("finding-price", -1), null);
  eq(move("finding-price", 1), "finding-room-time");
  eq(move("finding-confirm", 1), "fix");
  eq(move("fix", -1), "finding-confirm");
  eq(move("monitor", 1), null);
  eq(stale(1, 2), true);
  eq(stale(2, 2), false);
  eq(overlaps({ top: 0, left: 0, right: 4, bottom: 4 }, { top: 1, left: 1, right: 3, bottom: 5 }), true);
  eq(overlaps({ top: 0, left: 0, right: 4, bottom: 4 }, { top: 5, left: 0, right: 4, bottom: 8 }), false);
}
