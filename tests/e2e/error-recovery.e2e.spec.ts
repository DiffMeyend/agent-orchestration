/**
 * Error Recovery E2E Tests
 *
 * Tests graceful handling of agent failures.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OrchestratorSession,
  SessionManager,
  type SessionConfig
} from '@slate/orchestration';
import {
  AgentError,
  PermissionDeniedError,
  ValidationError,
  LLMError,
  WorktreeError,
  wrapError,
  isAgentError,
  isRecoverableError
} from '@slate/context-schema';
import type { ContextPayload } from '@slate/context-schema';

describe('Error Recovery E2E', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('Error Class Hierarchy', () => {
    it('should create AgentError with correct properties', () => {
      const error = new AgentError(
        'Test error',
        'polymath',
        'execute',
        true
      );

      expect(error.message).toBe('Test error');
      expect(error.agentId).toBe('polymath');
      expect(error.phase).toBe('execute');
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('AgentError');
    });

    it('should create PermissionDeniedError', () => {
      const error = new PermissionDeniedError(
        'write_files_in_worktree',
        'L1',
        'executor'
      );

      expect(error.permission).toBe('write_files_in_worktree');
      expect(error.autonomyLevel).toBe('L1');
      expect(error.agentId).toBe('executor');
      expect(error.recoverable).toBe(false);
      expect(error.name).toBe('PermissionDeniedError');
    });

    it('should create ValidationError', () => {
      const error = new ValidationError(
        'TaskMap',
        ['missing required field: goal', 'options must have at least one item'],
        'polymath'
      );

      expect(error.artifactType).toBe('TaskMap');
      expect(error.validationErrors).toHaveLength(2);
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('ValidationError');
    });

    it('should create LLMError', () => {
      const error = new LLMError(
        'Rate limit exceeded',
        'polymath',
        429,
        true
      );

      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
      expect(error.name).toBe('LLMError');
    });

    it('should create WorktreeError', () => {
      const error = new WorktreeError(
        'Failed to create worktree',
        'executor',
        'wt-123',
        'create'
      );

      expect(error.worktreeId).toBe('wt-123');
      expect(error.operation).toBe('create');
      expect(error.recoverable).toBe(false); // Create failures not recoverable
      expect(error.name).toBe('WorktreeError');
    });
  });

  describe('Error Wrapping', () => {
    it('should wrap unknown error in AgentError', () => {
      const originalError = new Error('Something went wrong');
      const wrapped = wrapError(originalError, 'polymath');

      expect(wrapped).toBeInstanceOf(AgentError);
      expect(wrapped.message).toBe('Something went wrong');
      expect(wrapped.agentId).toBe('polymath');
      expect(wrapped.cause).toBe(originalError);
    });

    it('should not rewrap AgentError', () => {
      const agentError = new AgentError('Original', 'polymath', 'execute', true);
      const wrapped = wrapError(agentError, 'executor');

      expect(wrapped).toBe(agentError);
      expect(wrapped.agentId).toBe('polymath'); // Original agent preserved
    });

    it('should wrap string error', () => {
      const wrapped = wrapError('String error', 'polymath');

      expect(wrapped).toBeInstanceOf(AgentError);
      expect(wrapped.message).toBe('String error');
    });
  });

  describe('Error Type Guards', () => {
    it('should identify AgentError', () => {
      const agentError = new AgentError('Test', 'polymath', 'execute', true);
      const regularError = new Error('Test');

      expect(isAgentError(agentError)).toBe(true);
      expect(isAgentError(regularError)).toBe(false);
      expect(isAgentError(null)).toBe(false);
      expect(isAgentError('string')).toBe(false);
    });

    it('should identify recoverable errors', () => {
      const recoverableError = new ValidationError('TaskMap', ['error'], 'polymath');
      const nonRecoverableError = new PermissionDeniedError('write', 'L1', 'executor');
      const unknownError = new Error('Unknown');

      expect(isRecoverableError(recoverableError)).toBe(true);
      expect(isRecoverableError(nonRecoverableError)).toBe(false);
      expect(isRecoverableError(unknownError)).toBe(true); // Unknown errors assumed recoverable
    });
  });

  describe('Session Error Handling', () => {
    it('should fail session and record error', () => {
      const session = sessionManager.create(createConfig('Error test'));
      session.start();

      session.fail('Agent failed: LLM timeout');

      expect(session.state).toBe('failed');
      expect(session.error).toBe('Agent failed: LLM timeout');
      expect(session.currentStep).toBe('polymath'); // Preserved at failure point
    });

    it('should track error in metadata', () => {
      const session = sessionManager.create(createConfig('Error test'));
      session.start();
      session.fail('Validation failed');

      const metadata = session.getMetadata();

      expect(metadata.state).toBe('failed');
      expect(metadata.error).toBe('Validation failed');
    });

    it('should prevent state transitions after failure', () => {
      const session = sessionManager.create(createConfig('Error test'));
      session.start();
      session.fail('Fatal error');

      expect(() => session.advanceTo('resonant')).toThrow();
      expect(() => session.complete()).not.toThrow(); // complete() doesn't check state
    });
  });

  describe('Error JSON Serialization', () => {
    it('should serialize AgentError to JSON', () => {
      const error = new AgentError('Test', 'polymath', 'execute', true);
      const json = error.toJSON();

      expect(json.name).toBe('AgentError');
      expect(json.message).toBe('Test');
      expect(json.agentId).toBe('polymath');
      expect(json.phase).toBe('execute');
      expect(json.recoverable).toBe(true);
    });

    it('should serialize PermissionDeniedError to JSON', () => {
      const error = new PermissionDeniedError('write', 'L1', 'executor');
      const json = error.toJSON();

      expect(json.permission).toBe('write');
      expect(json.autonomyLevel).toBe('L1');
    });

    it('should serialize LLMError to JSON', () => {
      const error = new LLMError('Rate limit', 'polymath', 429, true);
      const json = error.toJSON();

      expect(json.statusCode).toBe(429);
      expect(json.retryable).toBe(true);
    });

    it('should include cause message in JSON', () => {
      const cause = new Error('Root cause');
      const error = new AgentError('Wrapped', 'polymath', 'execute', true, cause);
      const json = error.toJSON();

      expect(json.cause).toBe('Root cause');
    });
  });

  describe('Graceful Degradation', () => {
    it('should allow session to continue after recoverable error', () => {
      const session = sessionManager.create(createConfig('Degradation test'));
      session.start();

      // Store partial results before "error"
      session.storeArtifact('TaskMap', createMockTaskMap(), 'polymath');

      // Simulate recoverable error - session can still be advanced
      // (In real scenario, orchestrator would handle this)
      session.advanceTo('resonant');

      expect(session.state).toBe('running');
      expect(session.currentStep).toBe('resonant');
      expect(session.getAllArtifacts()).toHaveLength(1);
    });

    it('should preserve artifacts when session fails', () => {
      const session = sessionManager.create(createConfig('Artifact preservation'));
      session.start();

      session.storeArtifact('TaskMap', createMockTaskMap(), 'polymath');
      session.advanceTo('resonant');
      session.storeArtifact('EvidencePack', createMockEvidencePack(), 'resonant');

      // Fail at architect stage
      session.fail('Architect failed');

      // Artifacts should still be accessible
      expect(session.getAllArtifacts()).toHaveLength(2);
      expect(session.getTaskMap()).toBeDefined();
      expect(session.getEvidencePack()).toBeDefined();
    });
  });
});

// Helper functions

function createConfig(goal: string): SessionConfig {
  return {
    goal,
    context: createMockContext(),
    autonomyLevel: 'L2'
  };
}

function createMockContext(): ContextPayload {
  return {
    questions: {},
    decision_matrix: {}
  };
}

function createMockTaskMap() {
  return {
    id: `tm-${Date.now()}`,
    created_at: new Date().toISOString(),
    goal: 'Test',
    assumptions: [],
    unknowns: [],
    options: [],
    quick_checks: [],
    recommended_next: 'Next'
  };
}

function createMockEvidencePack() {
  return {
    id: `ep-${Date.now()}`,
    created_at: new Date().toISOString(),
    facts: [],
    risks: [],
    constraints: [],
    values_alignment: { safety: 'high', helpfulness: 'high', honesty: 'high' },
    recommendation: 'Proceed'
  };
}
