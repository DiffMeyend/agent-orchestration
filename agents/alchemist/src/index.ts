/**
 * Alchemist Agent
 *
 * Creative reframing - emits OptionsSet artifacts.
 */

export {
  run,
  createOptionsSet,
  validateOptionsSet,
  reframeProblem,
  generateAlternatives,
  identifyRisks,
  selectSafeDefault,
  AGENT_METADATA,
  type AlchemistInput,
  type AlchemistOutput,
  type RunnerConfig,
  type AlchemistTrigger
} from "./runner.js";

export {
  hasPermission,
  getPermissions,
  validatePermissions,
  ALCHEMIST_PERMISSIONS,
  type AutonomyLevel,
  type Permission
} from "./permissions.js";
