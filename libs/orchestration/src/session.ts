/**
 * Orchestrator Session
 *
 * Manages multi-agent pipeline execution with state tracking.
 * Supports optional file-based persistence for session recovery.
 */

import fs from "node:fs/promises";
import path from "node:path";
import type {
  TaskMap,
  EvidencePack,
  DesignSpec,
  PatchSet,
  ShipDecision,
  OptionsSet,
  ContextPayload,
  AutonomyLevel
} from "@slate/context-schema";
import {
  ArtifactStore,
  type StoredArtifact,
  type ArtifactType,
  createStoredArtifact
} from "./artifact-store.js";

// Default persistence directory
const DEFAULT_SESSIONS_DIR = "sessions";

/**
 * Serializable session data for persistence
 */
export interface SerializedSession {
  id: string;
  state: SessionState;
  currentStep?: PipelineStep;
  createdAt: string;
  updatedAt: string;
  config: SessionConfig;
  error?: string;
  artifacts: StoredArtifact[];
}

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  enabled: boolean;
  directory: string;
}

export type SessionState =
  | "created"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export type PipelineStep =
  | "polymath"
  | "resonant"
  | "architect"
  | "executor"
  | "horizon"
  | "alchemist";

export interface SessionConfig {
  autonomyLevel: AutonomyLevel;
  context: ContextPayload;
  goal: string;
}

export interface SessionMetadata {
  id: string;
  state: SessionState;
  currentStep?: PipelineStep;
  createdAt: string;
  updatedAt: string;
  config: SessionConfig;
  error?: string;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `session-${date}-${random}`;
}

/**
 * Orchestrator session that manages a multi-agent pipeline
 */
export class OrchestratorSession {
  readonly id: string;
  private _state: SessionState = "created";
  private _currentStep?: PipelineStep;
  private _error?: string;
  private readonly artifacts: ArtifactStore;
  private readonly config: SessionConfig;
  private readonly createdAt: string;
  private updatedAt: string;

  constructor(config: SessionConfig, id?: string) {
    this.id = id || generateSessionId();
    this.config = config;
    this.artifacts = new ArtifactStore();
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  get state(): SessionState {
    return this._state;
  }

  get currentStep(): PipelineStep | undefined {
    return this._currentStep;
  }

  get error(): string | undefined {
    return this._error;
  }

  /**
   * Get session metadata
   */
  getMetadata(): SessionMetadata {
    return {
      id: this.id,
      state: this._state,
      currentStep: this._currentStep,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      config: this.config,
      error: this._error
    };
  }

  /**
   * Transition to a new state
   */
  private transition(state: SessionState, step?: PipelineStep): void {
    this._state = state;
    this._currentStep = step;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Start the pipeline
   */
  start(): void {
    if (this._state !== "created") {
      throw new Error(`Cannot start session in state: ${this._state}`);
    }
    this.transition("running", "polymath");
  }

  /**
   * Advance to the next step
   */
  advanceTo(step: PipelineStep): void {
    if (this._state !== "running") {
      throw new Error(`Cannot advance session in state: ${this._state}`);
    }
    this.transition("running", step);
  }

  /**
   * Pause the pipeline
   */
  pause(): void {
    if (this._state !== "running") {
      throw new Error(`Cannot pause session in state: ${this._state}`);
    }
    this.transition("paused", this._currentStep);
  }

  /**
   * Resume a paused pipeline
   */
  resume(): void {
    if (this._state !== "paused") {
      throw new Error(`Cannot resume session in state: ${this._state}`);
    }
    this.transition("running", this._currentStep);
  }

  /**
   * Complete the pipeline successfully
   */
  complete(): void {
    this.transition("completed");
  }

  /**
   * Fail the pipeline with an error
   */
  fail(error: string): void {
    this._error = error;
    this.transition("failed", this._currentStep);
  }

  /**
   * Store an artifact from an agent
   */
  storeArtifact(
    type: ArtifactType,
    data: StoredArtifact["data"],
    agentId: string,
    parentId?: string
  ): StoredArtifact {
    const artifact = createStoredArtifact(
      type,
      data,
      this.id,
      agentId,
      parentId
    );
    this.artifacts.store(artifact);
    return artifact;
  }

  /**
   * Get an artifact by ID
   */
  getArtifact(id: string): StoredArtifact | undefined {
    return this.artifacts.get(id);
  }

  /**
   * Get all artifacts for this session
   */
  getAllArtifacts(): StoredArtifact[] {
    return this.artifacts.getBySession(this.id);
  }

  /**
   * Get the latest artifact of a type
   */
  getLatestArtifact(type: ArtifactType): StoredArtifact | undefined {
    const artifacts = this.artifacts
      .getByType(type)
      .filter((a) => a.sessionId === this.id)
      .sort((a, b) => b.sequence - a.sequence);
    return artifacts[0];
  }

  /**
   * Get artifact lineage
   */
  getLineage(artifactId: string): StoredArtifact[] {
    return this.artifacts.getLineage(artifactId);
  }

  /**
   * Get the TaskMap for this session
   */
  getTaskMap(): TaskMap | undefined {
    const artifact = this.getLatestArtifact("TaskMap");
    return artifact?.data as TaskMap | undefined;
  }

  /**
   * Get the EvidencePack for this session
   */
  getEvidencePack(): EvidencePack | undefined {
    const artifact = this.getLatestArtifact("EvidencePack");
    return artifact?.data as EvidencePack | undefined;
  }

  /**
   * Get the DesignSpec for this session
   */
  getDesignSpec(): DesignSpec | undefined {
    const artifact = this.getLatestArtifact("DesignSpec");
    return artifact?.data as DesignSpec | undefined;
  }

  /**
   * Get the PatchSet for this session
   */
  getPatchSet(): PatchSet | undefined {
    const artifact = this.getLatestArtifact("PatchSet");
    return artifact?.data as PatchSet | undefined;
  }

  /**
   * Get the ShipDecision for this session
   */
  getShipDecision(): ShipDecision | undefined {
    const artifact = this.getLatestArtifact("ShipDecision");
    return artifact?.data as ShipDecision | undefined;
  }

  /**
   * Get the OptionsSet for this session (if Alchemist was triggered)
   */
  getOptionsSet(): OptionsSet | undefined {
    const artifact = this.getLatestArtifact("OptionsSet");
    return artifact?.data as OptionsSet | undefined;
  }

  /**
   * Serialize session for persistence
   */
  serialize(): SerializedSession {
    return {
      id: this.id,
      state: this._state,
      currentStep: this._currentStep,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      config: this.config,
      error: this._error,
      artifacts: this.getAllArtifacts()
    };
  }

  /**
   * Restore session from serialized data
   */
  static fromSerialized(data: SerializedSession): OrchestratorSession {
    const session = new OrchestratorSession(data.config, data.id);
    // Restore internal state (bypassing state machine for recovery)
    (session as any)._state = data.state;
    (session as any)._currentStep = data.currentStep;
    (session as any)._error = data.error;
    (session as any).createdAt = data.createdAt;
    (session as any).updatedAt = data.updatedAt;

    // Restore artifacts
    for (const artifact of data.artifacts) {
      session.artifacts.store(artifact);
    }

    return session;
  }
}

/**
 * Session manager for tracking all active sessions with optional persistence
 */
export class SessionManager {
  private sessions: Map<string, OrchestratorSession> = new Map();
  private persistence: PersistenceConfig;
  private initialized = false;
  private lastError?: string;

  constructor(persistence?: Partial<PersistenceConfig>) {
    this.persistence = {
      enabled: persistence?.enabled ?? false,
      directory: persistence?.directory ?? DEFAULT_SESSIONS_DIR
    };
  }

  /**
   * Initialize the session manager (loads persisted sessions if enabled)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    if (this.persistence.enabled) {
      await this.loadSessions();
    }
    this.initialized = true;
  }

  /**
   * Create a new session
   */
  async create(config: SessionConfig): Promise<OrchestratorSession> {
    const session = new OrchestratorSession(config);
    this.sessions.set(session.id, session);

    if (this.persistence.enabled) {
      await this.persistSession(session);
    }

    return session;
  }

  /**
   * Synchronous create (for backwards compatibility)
   */
  createSync(config: SessionConfig): OrchestratorSession {
    const session = new OrchestratorSession(config);
    this.sessions.set(session.id, session);

    if (this.persistence.enabled) {
      // Fire and forget persistence
      this.persistSession(session).catch((err) => {
        this.lastError = err instanceof Error ? err.message : String(err);
      });
    }

    return session;
  }

  /**
   * Get a session by ID
   */
  get(id: string): OrchestratorSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * List all sessions
   */
  list(): SessionMetadata[] {
    return Array.from(this.sessions.values()).map((s) => s.getMetadata());
  }

  /**
   * Delete a session
   */
  async delete(id: string): Promise<boolean> {
    const deleted = this.sessions.delete(id);

    if (deleted && this.persistence.enabled) {
      await this.deleteSessionFile(id);
    }

    return deleted;
  }

  /**
   * Synchronous delete (for backwards compatibility)
   */
  deleteSync(id: string): boolean {
    const deleted = this.sessions.delete(id);

    if (deleted && this.persistence.enabled) {
      this.deleteSessionFile(id).catch((err) => {
        this.lastError = err instanceof Error ? err.message : String(err);
      });
    }

    return deleted;
  }

  /**
   * Get count of sessions
   */
  get size(): number {
    return this.sessions.size;
  }

  /**
   * Save a session to disk (call after session updates)
   */
  async saveSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session && this.persistence.enabled) {
      await this.persistSession(session);
    }
  }

  /**
   * Get persistence status
   */
  getStatus(): { enabled: boolean; directory: string; count: number; lastError?: string } {
    return {
      enabled: this.persistence.enabled,
      directory: this.persistence.directory,
      count: this.sessions.size,
      lastError: this.lastError
    };
  }

  // ========== Private Persistence Methods ==========

  private async ensureDirectory(): Promise<string> {
    const dir = path.isAbsolute(this.persistence.directory)
      ? this.persistence.directory
      : path.join(process.cwd(), this.persistence.directory);

    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  private async persistSession(session: OrchestratorSession): Promise<void> {
    try {
      const dir = await this.ensureDirectory();
      const filePath = path.join(dir, `${session.id}.json`);
      const data = session.serialize();
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), {
        encoding: "utf8",
        mode: 0o600
      });
      this.lastError = undefined;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error(`Failed to persist session ${session.id}:`, error);
    }
  }

  private async loadSessions(): Promise<void> {
    try {
      const dir = await this.ensureDirectory();
      const files = await fs.readdir(dir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(dir, file);
          const raw = await fs.readFile(filePath, "utf8");
          const data = JSON.parse(raw) as SerializedSession;
          const session = OrchestratorSession.fromSerialized(data);
          this.sessions.set(session.id, session);
        } catch (err) {
          console.warn(`Failed to load session from ${file}:`, err);
        }
      }

      this.lastError = undefined;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        this.lastError = error instanceof Error ? error.message : String(error);
        console.error("Failed to load sessions:", error);
      }
    }
  }

  private async deleteSessionFile(id: string): Promise<void> {
    try {
      const dir = await this.ensureDirectory();
      const filePath = path.join(dir, `${id}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore ENOENT (file already deleted)
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    }
  }
}
