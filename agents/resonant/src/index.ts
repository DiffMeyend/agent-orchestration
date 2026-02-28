/**
 * Resonant Agent
 *
 * Research and alignment - produces EvidencePack artifacts.
 */

export {
  run,
  createEvidencePack,
  validateEvidencePack,
  validateFacts,
  assessRisks,
  checkConstraints,
  evaluateValuesAlignment,
  AGENT_METADATA,
  type ResonantInput,
  type ResonantOutput,
  type RunnerConfig
} from "./runner.js";

export {
  hasPermission,
  getPermissions,
  validatePermissions,
  RESONANT_PERMISSIONS,
  type AutonomyLevel,
  type Permission
} from "./permissions.js";
