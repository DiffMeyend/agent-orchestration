import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const existingPaths = new Set<string>();
const execSyncMock = vi.fn((cmd: string) => {
  if (cmd.startsWith("git rev-parse")) {
    return "/repo";
  }
  if (cmd.includes("git worktree add")) {
    const match = cmd.match(/"(.+?)"/);
    if (match) {
      existingPaths.add(match[1]);
    }
  }
  if (cmd.includes("git worktree remove")) {
    const match = cmd.match(/"(.+?)"/);
    if (match) {
      existingPaths.delete(match[1]);
    }
  }
  return "";
});

const fsMocks = {
  existsSync: vi.fn((path: string) => existingPaths.has(path)),
  mkdirSync: vi.fn((path: string) => {
    existingPaths.add(path);
  }),
  rmSync: vi.fn((path: string) => {
    existingPaths.delete(path);
  })
};

vi.mock("child_process", () => ({
  execSync: execSyncMock
}));

vi.mock("fs", () => fsMocks);

describe("worktree management", () => {
  beforeEach(() => {
    existingPaths.clear();
    execSyncMock.mockClear();
    fsMocks.existsSync.mockClear();
    fsMocks.mkdirSync.mockClear();
    fsMocks.rmSync.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    existingPaths.clear();
  });

  it("creates and tracks a worktree", async () => {
    const {
      createWorktree,
      getWorktree,
      listWorktrees,
      isPathInWorktree
    } = await import("./worktree.js");

    const info = createWorktree("test-worktree");
    expect(info.branch).toBe("executor/test-worktree");
    expect(getWorktree("test-worktree")).toMatchObject({ status: "active" });
    expect(listWorktrees()).toHaveLength(1);
    expect(isPathInWorktree(`${info.path}/file`, info.id)).toBe(true);
  });

  it("marks and cleans up worktrees", async () => {
    const {
      createWorktree,
      markWorktreeMerged,
      markWorktreeRejected,
      cleanupWorktree,
      listWorktrees
    } = await import("./worktree.js");

    const info = createWorktree("cleanup-test");
    markWorktreeMerged(info.id);
    markWorktreeRejected(info.id);
    existingPaths.add(info.path);
    const result = cleanupWorktree(info.id);
    expect(result.success).toBe(true);
    expect(listWorktrees()).toHaveLength(0);
  });

  it("fails cleanup for unknown ids", async () => {
    const { cleanupWorktree } = await import("./worktree.js");
    expect(cleanupWorktree("missing").success).toBe(false);
  });
});
