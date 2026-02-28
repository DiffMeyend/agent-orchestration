/**
 * Pipeline E2E Tests
 *
 * Tests the full agent pipeline: Task → Polymath → Executor → Horizon → ShipDecision
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OrchestratorSession,
  SessionManager,
  PIPELINE_ORDER,
  getNextStep,
  type SessionConfig,
  type PipelineStep
} from '@slate/orchestration';
import type { ContextPayload, AutonomyLevel } from '@slate/context-schema';

describe('Pipeline E2E', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('Session Lifecycle', () => {
    it('should create a new session with valid config', () => {
      const config: SessionConfig = {
        goal: 'Implement user authentication',
        context: createMockContext(),
        autonomyLevel: 'L2'
      };

      const session = sessionManager.create(config);

      expect(session.id).toMatch(/^session-\d{4}-\d{2}-\d{2}-[a-z0-9]+$/);
      expect(session.state).toBe('created');
      expect(session.currentStep).toBeUndefined();
    });

    it('should transition through states correctly', () => {
      const session = createTestSession(sessionManager);

      expect(session.state).toBe('created');

      session.start();
      expect(session.state).toBe('running');
      expect(session.currentStep).toBe('polymath');

      session.advanceTo('resonant');
      expect(session.currentStep).toBe('resonant');

      session.pause();
      expect(session.state).toBe('paused');

      session.resume();
      expect(session.state).toBe('running');

      session.complete();
      expect(session.state).toBe('completed');
    });

    it('should fail session with error message', () => {
      const session = createTestSession(sessionManager);
      session.start();

      session.fail('LLM API timeout');

      expect(session.state).toBe('failed');
      expect(session.error).toBe('LLM API timeout');
    });
  });

  describe('Pipeline Order', () => {
    it('should define correct pipeline order', () => {
      expect(PIPELINE_ORDER).toEqual([
        'polymath',
        'resonant',
        'architect',
        'executor',
        'horizon'
      ]);
    });

    it('should get next step correctly', () => {
      expect(getNextStep('polymath')).toBe('resonant');
      expect(getNextStep('resonant')).toBe('architect');
      expect(getNextStep('architect')).toBe('executor');
      expect(getNextStep('executor')).toBe('horizon');
      expect(getNextStep('horizon')).toBeUndefined();
    });
  });

  describe('Artifact Storage', () => {
    it('should store and retrieve artifacts', () => {
      const session = createTestSession(sessionManager);
      session.start();

      const mockTaskMap = createMockTaskMap();
      const stored = session.storeArtifact('TaskMap', mockTaskMap, 'polymath');

      expect(stored.id).toBe(mockTaskMap.id);
      expect(stored.type).toBe('TaskMap');
      expect(stored.sessionId).toBe(session.id);
      expect(stored.agentId).toBe('polymath');

      const retrieved = session.getArtifact(mockTaskMap.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toEqual(mockTaskMap);
    });

    it('should track artifact lineage', () => {
      const session = createTestSession(sessionManager);
      session.start();

      // Store TaskMap (no parent)
      const taskMap = createMockTaskMap();
      session.storeArtifact('TaskMap', taskMap, 'polymath');

      // Store EvidencePack (parent is TaskMap)
      const evidencePack = createMockEvidencePack();
      session.storeArtifact('EvidencePack', evidencePack, 'resonant', taskMap.id);

      // Store DesignSpec (parent is EvidencePack)
      const designSpec = createMockDesignSpec();
      session.storeArtifact('DesignSpec', designSpec, 'architect', evidencePack.id);

      // Get lineage
      const lineage = session.getLineage(designSpec.id);

      expect(lineage).toHaveLength(3);
      expect(lineage[0].id).toBe(designSpec.id);
      expect(lineage[1].id).toBe(evidencePack.id);
      expect(lineage[2].id).toBe(taskMap.id);
    });

    it('should retrieve latest artifact by type', () => {
      const session = createTestSession(sessionManager);
      session.start();

      const taskMap1 = { ...createMockTaskMap(), id: 'tm-1' };
      const taskMap2 = { ...createMockTaskMap(), id: 'tm-2' };

      session.storeArtifact('TaskMap', taskMap1, 'polymath');
      session.storeArtifact('TaskMap', taskMap2, 'polymath');

      const latest = session.getTaskMap();
      expect(latest?.id).toBe('tm-2');
    });
  });

  describe('Full Pipeline Simulation', () => {
    it('should complete full pipeline with artifacts', () => {
      const session = createTestSession(sessionManager);

      // Start pipeline
      session.start();
      expect(session.currentStep).toBe('polymath');

      // Polymath produces TaskMap
      const taskMap = createMockTaskMap();
      session.storeArtifact('TaskMap', taskMap, 'polymath');
      session.advanceTo('resonant');

      // Resonant produces EvidencePack
      const evidencePack = createMockEvidencePack();
      session.storeArtifact('EvidencePack', evidencePack, 'resonant', taskMap.id);
      session.advanceTo('architect');

      // Architect produces DesignSpec
      const designSpec = createMockDesignSpec();
      session.storeArtifact('DesignSpec', designSpec, 'architect', evidencePack.id);
      session.advanceTo('executor');

      // Executor produces PatchSet
      const patchSet = createMockPatchSet();
      session.storeArtifact('PatchSet', patchSet, 'executor', designSpec.id);
      session.advanceTo('horizon');

      // Horizon produces ShipDecision
      const shipDecision = createMockShipDecision();
      session.storeArtifact('ShipDecision', shipDecision, 'horizon', patchSet.id);

      // Complete session
      session.complete();

      // Verify final state
      expect(session.state).toBe('completed');
      expect(session.getAllArtifacts()).toHaveLength(5);
      expect(session.getShipDecision()?.decision).toBe('ship');
    });
  });
});

// Helper functions

function createTestSession(manager: SessionManager): OrchestratorSession {
  const config: SessionConfig = {
    goal: 'Test goal',
    context: createMockContext(),
    autonomyLevel: 'L2'
  };
  return manager.create(config);
}

function createMockContext(): ContextPayload {
  return {
    questions: {
      q1_actors: { answer: 'Developer', confidence: 0.9 },
      q2_motivation: { answer: 'Ship feature', confidence: 0.8 }
    },
    decision_matrix: {}
  };
}

function createMockTaskMap() {
  return {
    id: `tm-${Date.now()}`,
    created_at: new Date().toISOString(),
    goal: 'Implement feature',
    assumptions: ['API is stable'],
    unknowns: ['Performance requirements'],
    options: [{ id: 'opt-1', description: 'Direct implementation', pros: [], cons: [] }],
    quick_checks: ['Run tests'],
    recommended_next: 'Proceed with option 1'
  };
}

function createMockEvidencePack() {
  return {
    id: `ep-${Date.now()}`,
    created_at: new Date().toISOString(),
    facts: [{ claim: 'API is stable', source: 'docs', confidence: 0.9 }],
    risks: [{ description: 'API changes', severity: 'medium', likelihood: 'low', mitigation: 'Version pin' }],
    constraints: [{ type: 'technical', description: 'Must use existing auth', source: 'requirements' }],
    values_alignment: { safety: 'high', helpfulness: 'high', honesty: 'high' },
    recommendation: 'Proceed with caution'
  };
}

function createMockDesignSpec() {
  return {
    id: `ds-${Date.now()}`,
    created_at: new Date().toISOString(),
    scope: 'Authentication module',
    acceptance_criteria: [{ id: 'ac-1', description: 'User can log in', testable: true }],
    interfaces: [{ name: 'AuthService', methods: ['login', 'logout'], dependencies: [] }],
    non_goals: ['OAuth integration'],
    test_plan: 'Unit tests for AuthService'
  };
}

function createMockPatchSet() {
  return {
    id: `ps-${Date.now()}`,
    created_at: new Date().toISOString(),
    worktree_id: 'wt-123',
    branch: 'feature/auth',
    diff: 'diff --git a/auth.ts...',
    files_changed: ['src/auth.ts'],
    test_results: [{ suite: 'auth', passed: 5, failed: 0, skipped: 0 }],
    commands_run: []
  };
}

function createMockShipDecision() {
  return {
    id: `sd-${Date.now()}`,
    created_at: new Date().toISOString(),
    decision: 'ship' as const,
    rationale: 'All tests pass, no security issues',
    gates_passed: ['tests', 'security', 'acceptance'],
    gates_failed: [],
    anti_patterns_detected: [],
    review_count: 1
  };
}
