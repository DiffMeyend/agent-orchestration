import type { RuntimeStateName } from './runtimeState.js';

export type TaskType = 'simple_task' | 'complex_task';
export type Mode = 'quiet' | 'verbose';
export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3';

export interface AutonomyDecision {
  state: RuntimeStateName;
  taskType: TaskType;
  level: AutonomyLevel;
  source?: string;
}
