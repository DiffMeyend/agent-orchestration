export type RuntimeStateName = 'deep_focus' | 'faded_focus' | 'simple_task' | 'complex_task';

export type RuntimeStateTag = `#state:${RuntimeStateName}`;

export interface RuntimeStateSnapshot {
  tag: RuntimeStateTag;
  updatedAt: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}
