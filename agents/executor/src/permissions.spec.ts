import { describe, it, expect } from "vitest";
import {
  EXECUTOR_PERMISSIONS,
  hasPermission,
  validatePermissions,
  canExecute
} from "./permissions.js";

describe("Executor permissions", () => {
  it("grants progressive abilities per autonomy level", () => {
    expect(EXECUTOR_PERMISSIONS.L1).toContain("propose_diff");
    expect(hasPermission("L2", "write_files_in_worktree")).toBe(true);
    expect(hasPermission("L1", "write_files_in_worktree")).toBe(false);
  });

  it("denies unauthorized requests", () => {
    const result = validatePermissions("L1", ["commit_to_branch", "propose_diff"]);
    expect(result.valid).toBe(false);
    expect(result.denied).toEqual(["commit_to_branch"]);
  });

  it("only executes at L1+", () => {
    expect(canExecute("L0")).toBe(false);
    expect(canExecute("L2")).toBe(true);
  });
});
