/**
 * Executor Agent
 *
 * Purpose: Implement designs in isolated git worktrees.
 * Produces: PatchSet artifact
 *
 * CRITICAL: This is the ONLY agent that can write code.
 */

export {
  run,
  createPatchSet,
  validatePatchSet,
  isPathInWorktree,
  AGENT_METADATA,
  type ExecutorInput,
  type ExecutorOutput,
  type RunnerConfig
} from "./runner.js";

export {
  hasPermission,
  getPermissions,
  validatePermissions,
  canExecute,
  EXECUTOR_PERMISSIONS,
  type AutonomyLevel,
  type Permission
} from "./permissions.js";
