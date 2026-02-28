/**
 * Orchestration Module
 *
 * Multi-agent pipeline orchestration for SLATE.
 */

export {
  ArtifactStore,
  createStoredArtifact,
  type ArtifactType,
  type StoredArtifact,
  type LineageNode
} from "./artifact-store.js";

export {
  OrchestratorSession,
  SessionManager,
  type SessionConfig,
  type SessionMetadata,
  type SessionState,
  type PipelineStep,
  type SerializedSession,
  type PersistenceConfig
} from "./session.js";

export {
  PIPELINE_ORDER,
  SKIPPABLE_STEPS,
  AGENT_METADATA,
  getNextStep,
  getPreviousStep,
  isValidStep,
  canProceed,
  canSkipStep,
  createPipelineResult,
  createDegradationState,
  createFallbackEvidencePack,
  recordDegradation,
  handleStepFailure,
  type AgentMetadata,
  type PipelineResult,
  type DegradationState
} from "./pipeline.js";
