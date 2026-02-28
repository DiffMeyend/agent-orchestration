import { describe, it, expect } from "vitest";
import { resolveAutonomy } from "./autonomy-resolver.js";
import type { OperatorState } from "./state-machine.js";

const CASES: Array<{ state: OperatorState; css: number; expected: string }> = [
  { state: "fresh", css: 0, expected: "L0" },
  { state: "fresh", css: 35, expected: "L1" },
  { state: "fresh", css: 75, expected: "L2" },
  { state: "fresh", css: 92, expected: "L3" },
  { state: "mid", css: 10, expected: "L0" },
  { state: "mid", css: 45, expected: "L1" },
  { state: "mid", css: 70, expected: "L2" },
  { state: "mid", css: 95, expected: "L2" },
  { state: "faded", css: 5, expected: "L0" },
  { state: "faded", css: 40, expected: "L0" },
  { state: "faded", css: 65, expected: "L1" },
  { state: "faded", css: 91, expected: "L1" },
  { state: "high_pressure", css: 15, expected: "L0" },
  { state: "high_pressure", css: 40, expected: "L1" },
  { state: "high_pressure", css: 70, expected: "L1" },
  { state: "high_pressure", css: 93, expected: "L2" }
];

describe("resolveAutonomy", () => {
  it("maps every State×CSS combination", () => {
    for (const { state, css, expected } of CASES) {
      expect(resolveAutonomy(state, css)).toBe(expected);
    }
  });

  it("treats invalid CSS scores as zero", () => {
    expect(resolveAutonomy("fresh", Number.NaN)).toBe("L0");
  });
});
