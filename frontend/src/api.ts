import type { GraphSnapshot } from "./types";
import { applyLocal, initialLocal } from "./localEngine";

export interface Engine {
  mode: "jac" | "local_fixture";
  note: string;
}

async function spawnJac(name: string, body: Record<string, string> = {}): Promise<GraphSnapshot> {
  let response: Response;
  try {
    response = await fetch(`/walker/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("The investigation stopped.");
  }
  if (!response.ok) {
    throw new Error(`Walker ${name} returned ${response.status}`);
  }
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error?.message || `Walker ${name} failed`);
  }
  const report = payload.data?.reports?.[0];
  if (!report) {
    throw new Error(`Walker ${name} returned an empty graph`);
  }
  return report as GraphSnapshot;
}

export async function loadInitial(): Promise<{ snapshot: GraphSnapshot; engine: Engine }> {
  try {
    const snapshot = await spawnJac("reset_demo");
    return {
      snapshot,
      engine: { mode: "jac", note: "Jac opportunity graph" },
    };
  } catch {
    return {
      snapshot: initialLocal(),
      engine: {
        mode: "local_fixture",
        note: "Jac server is not reachable. This pass uses the deterministic fixture locally. It is not a live graph.",
      },
    };
  }
}

export async function runWalker(
  engine: Engine,
  current: GraphSnapshot,
  name: string,
  body: Record<string, string> = {},
): Promise<{ snapshot: GraphSnapshot; engine: Engine }> {
  if (engine.mode === "local_fixture") {
    return { snapshot: applyLocal(current, name, body), engine };
  }
  try {
    const snapshot = await spawnJac(name, body);
    return { snapshot, engine };
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Walker ${name} failed`);
  }
}
