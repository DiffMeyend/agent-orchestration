/**
 * Worktree Management for Executor Agent
 *
 * Provides isolated git worktrees for safe code execution.
 * Each Executor invocation gets its own worktree, cleaned up after merge/reject.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

export interface WorktreeInfo {
  id: string;
  path: string;
  branch: string;
  created_at: string;
  status: "active" | "merged" | "rejected" | "cleaned";
}

export interface GitEnvironment {
  available: boolean;
  version?: string;
  inRepo: boolean;
  repoRoot?: string;
  error?: string;
}

// In-memory registry of active worktrees
const worktreeRegistry: Map<string, WorktreeInfo> = new Map();

// Base directory for worktrees
const WORKTREE_BASE = ".worktrees";

// Cached git environment check
let cachedGitEnv: GitEnvironment | null = null;

/**
 * Generate a unique worktree ID
 */
function generateWorktreeId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `executor-${timestamp}-${random}`;
}

/**
 * Check if git is available and we're in a repository
 */
export function checkGitEnvironment(forceRefresh = false): GitEnvironment {
  if (cachedGitEnv && !forceRefresh) {
    return cachedGitEnv;
  }

  const env: GitEnvironment = {
    available: false,
    inRepo: false
  };

  // Check if git binary is available
  try {
    const version = execSync("git --version", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000
    }).trim();
    env.available = true;
    env.version = version.replace("git version ", "");
  } catch (error) {
    env.error = "Git is not installed or not in PATH. Install git to use worktree features.";
    cachedGitEnv = env;
    return env;
  }

  // Check if we're in a git repository
  try {
    const root = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000
    }).trim();
    env.inRepo = true;
    env.repoRoot = root;
  } catch {
    env.error = `Git is available (${env.version}) but current directory is not inside a git repository. Run from a git repository or initialize one with 'git init'.`;
  }

  cachedGitEnv = env;
  return env;
}

/**
 * Clear the cached git environment (useful for testing or after directory changes)
 */
export function clearGitEnvironmentCache(): void {
  cachedGitEnv = null;
}

/**
 * Get the repository root directory
 */
function getRepoRoot(): string {
  const env = checkGitEnvironment();

  if (!env.available) {
    throw new Error(env.error || "Git is not available");
  }

  if (!env.inRepo || !env.repoRoot) {
    throw new Error(env.error || "Not in a git repository");
  }

  return env.repoRoot;
}

/**
 * Create an isolated git worktree for an Executor task
 */
export function createWorktree(taskId?: string): WorktreeInfo {
  const repoRoot = getRepoRoot();
  const worktreeId = taskId ?? generateWorktreeId();
  const branch = `executor/${worktreeId}`;
  const worktreePath = join(repoRoot, WORKTREE_BASE, worktreeId);

  // Ensure worktree base directory exists
  const baseDir = join(repoRoot, WORKTREE_BASE);
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  // Create new branch from current HEAD
  try {
    execSync(`git branch ${branch}`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch (error) {
    // Branch might already exist, which is fine
  }

  // Create worktree
  try {
    execSync(`git worktree add "${worktreePath}" ${branch}`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch (error) {
    throw new Error(`Failed to create worktree: ${error}`);
  }

  const info: WorktreeInfo = {
    id: worktreeId,
    path: worktreePath,
    branch,
    created_at: new Date().toISOString(),
    status: "active"
  };

  worktreeRegistry.set(worktreeId, info);
  return info;
}

/**
 * Get worktree info by ID
 */
export function getWorktree(worktreeId: string): WorktreeInfo | undefined {
  return worktreeRegistry.get(worktreeId);
}

/**
 * List all active worktrees
 */
export function listWorktrees(): WorktreeInfo[] {
  return Array.from(worktreeRegistry.values()).filter(
    (w) => w.status === "active"
  );
}

/**
 * Clean up a worktree after merge/reject
 */
export function cleanupWorktree(worktreeId: string): { success: boolean; error?: string } {
  const info = worktreeRegistry.get(worktreeId);
  if (!info) {
    return { success: false, error: `Worktree not found: ${worktreeId}` };
  }

  const repoRoot = getRepoRoot();

  try {
    // Remove the worktree
    execSync(`git worktree remove "${info.path}" --force`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch {
    // If git worktree remove fails, try manual cleanup
    if (existsSync(info.path)) {
      rmSync(info.path, { recursive: true, force: true });
    }
  }

  try {
    // Delete the branch
    execSync(`git branch -D ${info.branch}`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch {
    // Branch might already be deleted
  }

  // Update registry
  info.status = "cleaned";
  worktreeRegistry.set(worktreeId, info);

  return { success: true };
}

/**
 * Mark a worktree as merged (before cleanup)
 */
export function markWorktreeMerged(worktreeId: string): boolean {
  const info = worktreeRegistry.get(worktreeId);
  if (!info) return false;

  info.status = "merged";
  worktreeRegistry.set(worktreeId, info);
  return true;
}

/**
 * Mark a worktree as rejected (before cleanup)
 */
export function markWorktreeRejected(worktreeId: string): boolean {
  const info = worktreeRegistry.get(worktreeId);
  if (!info) return false;

  info.status = "rejected";
  worktreeRegistry.set(worktreeId, info);
  return true;
}

/**
 * Check if a path is within a valid worktree
 */
export function isPathInWorktree(filePath: string, worktreeId: string): boolean {
  const info = worktreeRegistry.get(worktreeId);
  if (!info || info.status !== "active") return false;

  // Normalize paths for comparison
  const normalizedPath = filePath.replace(/\\/g, "/");
  const normalizedWorktree = info.path.replace(/\\/g, "/");

  return normalizedPath.startsWith(normalizedWorktree);
}
