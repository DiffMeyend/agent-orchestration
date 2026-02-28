import { describe, it, expect } from "vitest";
import { POLYMATH_PERMISSIONS, hasPermission, validatePermissions } from "./permissions.js";

describe("Polymath permissions", () => {
  it("remains read-only at every autonomy level", () => {
    expect(POLYMATH_PERMISSIONS.L0).toEqual(["read_repo", "search_docs"]);
    expect(POLYMATH_PERMISSIONS.L3).toEqual(["read_repo", "search_docs"]);
  });

  it("blocks write attempts", () => {
    const result = validatePermissions("L3", ["write_briefs"]);
    expect(result.valid).toBe(false);
    expect(result.denied).toContain("write_briefs");
    expect(hasPermission("L2", "write_files_in_worktree")).toBe(false);
  });
});
