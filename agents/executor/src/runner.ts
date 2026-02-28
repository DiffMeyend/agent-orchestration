/**
 * Executor Agent Runner
 *
 * Purpose: Implement designs in isolated git worktrees.
 * Produces: PatchSet artifact
 * Permissions: Graduated based on autonomy level
 *
 * CRITICAL: This is the ONLY agent that can write code.
 * All writes MUST be confined to the assigned worktree.
 */

import { execSync } from "child_process";
import {
  PatchSetSchema,
  type PatchSet,
  type DesignSpec,
  type CommandResult,
  type TestResult,
  PermissionDeniedError,
  ValidationError,
  WorktreeError,
  wrapError
} from "@slate/context-schema";
import {
  type AutonomyLevel,
  validatePermissions,
  canExecute,
  type Permission
} from "./permissions.js";

const AGENT_ID = "executor" as const;

export interface ExecutorInput {
  designSpec: DesignSpec;
  worktreePath: string;
  worktreeId: string;
  branch: string;
  commands?: string[];
  testCommand?: string;
}

export interface ExecutorOutput {
  success: boolean;
  artifact?: PatchSet;
  errors?: string[];
}

export interface RunnerConfig {
  autonomyLevel: AutonomyLevel;
  sessionId?: string;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 60000; // 60 seconds
const TEST_TIMEOUT = 120000; // 2 minutes for tests

/**
 * Generate a unique PatchSet ID
 */
function generatePatchSetId(): string {
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `ps-${date}-${random}`;
}

/**
 * Check if a file path is within the worktree
 */
export function isPathInWorktree(filePath: string, worktreePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const normalizedWorktree = worktreePath.replace(/\\/g, "/");
  return normalizedPath.startsWith(normalizedWorktree);
}

/**
 * Execute a command and capture stdout/stderr/exitCode
 */
export function captureCommand(
  command: string,
  options: { cwd: string; timeout?: number; env?: NodeJS.ProcessEnv }
): CommandResult {
  try {
    const stdout = execSync(command, {
      cwd: options.cwd,
      encoding: "utf-8",
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"]
    });
    return {
      command,
      exit_code: 0,
      stdout: stdout.trim(),
      stderr: ""
    };
  } catch (error: unknown) {
    const execError = error as {
      status?: number;
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      message?: string;
    };
    return {
      command,
      exit_code: execError.status ?? 1,
      stdout: execError.stdout?.toString().trim() ?? "",
      stderr: execError.stderr?.toString().trim() ?? execError.message ?? "Unknown error"
    };
  }
}

/**
 * Parse Jest/Vitest test output into TestResult
 */
export function parseTestResults(stdout: string, suite: string): TestResult {
  // Vitest format: "Tests  10 passed | 2 failed | 1 skipped"
  // Jest format: "Tests: 10 passed, 2 failed, 1 skipped, 13 total"
  // Also handle: "✓ 10 tests passed" style

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Try various patterns
  const passedMatch = stdout.match(/(\d+)\s*(?:tests?\s+)?passed/i);
  const failedMatch = stdout.match(/(\d+)\s*(?:tests?\s+)?failed/i);
  const skippedMatch = stdout.match(/(\d+)\s*(?:tests?\s+)?skipped/i);

  if (passedMatch) passed = parseInt(passedMatch[1], 10);
  if (failedMatch) failed = parseInt(failedMatch[1], 10);
  if (skippedMatch) skipped = parseInt(skippedMatch[1], 10);

  // If no matches found, try to detect success/failure from exit messaging
  if (passed === 0 && failed === 0 && skipped === 0) {
    if (stdout.includes("PASS") || stdout.includes("✓")) {
      passed = 1;
    } else if (stdout.includes("FAIL") || stdout.includes("✗")) {
      failed = 1;
    }
  }

  return {
    suite,
    passed,
    failed,
    skipped,
    details: stdout
  };
}

/**
 * Capture git diff from worktree
 */
export function captureGitDiff(worktreePath: string): string {
  // First check if there are any changes
  const statusResult = captureCommand("git status --porcelain", { cwd: worktreePath });
  if (!statusResult.stdout) {
    return "No changes";
  }

  // Get diff stat
  const diffResult = captureCommand("git diff --stat HEAD", { cwd: worktreePath });
  if (diffResult.exit_code !== 0 || !diffResult.stdout) {
    // Try without HEAD (for new repos)
    const diffResult2 = captureCommand("git diff --stat", { cwd: worktreePath });
    return diffResult2.stdout || "Changes detected (diff unavailable)";
  }

  return diffResult.stdout;
}

/**
 * Get list of changed files in worktree
 */
export function getChangedFiles(worktreePath: string): string[] {
  // Get both staged and unstaged changes
  const result = captureCommand("git status --porcelain", { cwd: worktreePath });
  if (result.exit_code !== 0 || !result.stdout) {
    return [];
  }

  // Parse git status output: "XY filename" or "XY old -> new" for renames
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      // Remove status prefix (first 3 chars: XY + space)
      const file = line.substring(3);
      // Handle renames: "old -> new"
      if (file.includes(" -> ")) {
        return file.split(" -> ")[1];
      }
      return file;
    });
}

/**
 * Create a PatchSet from execution results
 */
export function createPatchSet(
  input: ExecutorInput,
  commandsRun: CommandResult[],
  testResults: TestResult[]
): PatchSet {
  const now = new Date().toISOString();

  return {
    id: generatePatchSetId(),
    created_at: now,
    design_spec_ref: input.designSpec.id,
    worktree: input.worktreePath,
    branch: input.branch,
    diff_summary: captureGitDiff(input.worktreePath),
    files_changed: getChangedFiles(input.worktreePath),
    commands_run: commandsRun,
    test_results: testResults,
    how_to_verify: input.designSpec.test_plan
  };
}

/**
 * Validate a PatchSet against the schema
 */
export function validatePatchSet(patchSet: unknown): {
  valid: boolean;
  errors?: string[];
  data?: PatchSet;
} {
  const result = PatchSetSchema.safeParse(patchSet);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
  };
}

/**
 * Create a permission guard scoped to Executor's autonomy level
 */
function createPermissionGuard(level: AutonomyLevel) {
  return (permission: Permission) => {
    const check = validatePermissions(level, [permission]);
    if (!check.valid) {
      throw new PermissionDeniedError(permission, level, AGENT_ID);
    }
  };
}

/**
 * Run the Executor agent
 */
export async function run(
  input: ExecutorInput,
  config: RunnerConfig
): Promise<ExecutorOutput> {
  // Check if execution is allowed at this autonomy level
  if (!canExecute(config.autonomyLevel)) {
    const error = new PermissionDeniedError(
      "execute",
      config.autonomyLevel,
      AGENT_ID,
      "init"
    );
    return {
      success: false,
      errors: [error.message]
    };
  }

  const requirePermission = createPermissionGuard(config.autonomyLevel);

  const timeout = config.timeout ?? DEFAULT_TIMEOUT;
  const commandsRun: CommandResult[] = [];
  const testResults: TestResult[] = [];

  try {
    requirePermission("read_repo");

    // Validate worktree path exists
    if (!input.worktreePath) {
      throw new WorktreeError(
        "Worktree path is required",
        AGENT_ID,
        input.worktreeId,
        "read"
      );
    }

    // Execute provided commands
    if (input.commands && input.commands.length > 0) {
      for (const cmd of input.commands) {
        requirePermission("write_files_in_worktree");
        try {
          const result = captureCommand(cmd, {
            cwd: input.worktreePath,
            timeout
          });
          commandsRun.push(result);

          // Stop on failure
          if (result.exit_code !== 0) {
            break;
          }
        } catch (cmdError) {
          throw new WorktreeError(
            `Command failed: ${cmd}`,
            AGENT_ID,
            input.worktreeId,
            "write",
            cmdError instanceof Error ? cmdError : undefined
          );
        }
      }
    }

    // Run tests if specified or use default
    const testCmd = input.testCommand ?? "npm test";
    requirePermission("run_tests");
    const testResult = captureCommand(testCmd, {
      cwd: input.worktreePath,
      timeout: TEST_TIMEOUT
    });
    commandsRun.push(testResult);

    // Parse test results
    const parsedTests = parseTestResults(
      testResult.stdout || testResult.stderr,
      "main"
    );
    testResults.push(parsedTests);

    requirePermission("read_repo");

    // Create PatchSet with real data
    const patchSet = createPatchSet(input, commandsRun, testResults);

    // Validate output
    const validation = validatePatchSet(patchSet);
    if (!validation.valid) {
      throw new ValidationError("PatchSet", validation.errors || [], AGENT_ID);
    }

    return {
      success: true,
      artifact: validation.data
    };
  } catch (error) {
    const wrappedError = wrapError(error, AGENT_ID);
    return {
      success: false,
      errors: [wrappedError.message]
    };
  }
}

/**
 * Agent metadata
 */
export const AGENT_METADATA = {
  id: "executor",
  name: "Executor",
  description: "Build and implementation agent - the only agent that writes code",
  produces: "PatchSet",
  permissions: "graduated (L0: none, L1: propose, L2: write/test, L3: commit)"
} as const;
