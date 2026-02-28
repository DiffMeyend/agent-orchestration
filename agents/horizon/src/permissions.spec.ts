import { describe, it, expect } from "vitest";
import {
  HORIZON_PERMISSIONS,
  hasPermission,
  validatePermissions,
  canApproveMerge
} from "./permissions.js";

describe("Horizon permissions", () => {
  it("allows verification tests only at limited levels", () => {
    expect(hasPermission("L1", "run_verification_tests")).toBe(true);
    expect(hasPermission("L0", "run_verification_tests")).toBe(false);
  });

  it("requires L3 to approve merges", () => {
    expect(canApproveMerge("L3")).toBe(true);
    expect(canApproveMerge("L2")).toBe(false);
  });

  it("flags invalid permissions", () => {
    const result = validatePermissions("L1", ["approve_merge"]);
    expect(result.valid).toBe(false);
    expect(result.denied).toContain("approve_merge");
  });
});
