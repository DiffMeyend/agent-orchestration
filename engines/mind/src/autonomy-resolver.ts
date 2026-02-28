import type { AutonomyLevel } from "slate-contracts";
import type { OperatorState } from "./state-machine.js";

const CSS_BUCKETS = [30, 60, 90];

const AUTONOMY_MATRIX: Record<OperatorState, AutonomyLevel[]> = {
  fresh: ["L0", "L1", "L2", "L3"],
  mid: ["L0", "L1", "L2", "L2"],
  faded: ["L0", "L0", "L1", "L1"],
  high_pressure: ["L0", "L1", "L1", "L2"]
};

function getCssBucket(css: number): number {
  if (css < CSS_BUCKETS[0]) return 0;
  if (css < CSS_BUCKETS[1]) return 1;
  if (css < CSS_BUCKETS[2]) return 2;
  return 3;
}

export function resolveAutonomy(state: OperatorState, cssScore: number): AutonomyLevel {
  const css = Number.isFinite(cssScore) ? Math.max(0, cssScore) : 0;
  const bucket = getCssBucket(css);
  const matrix = AUTONOMY_MATRIX[state] ?? AUTONOMY_MATRIX.fresh;
  return matrix[bucket];
}
