import type { AutonomyDecision, Mode } from './autonomy.js';
import type { RuntimeStateSnapshot } from './runtimeState.js';

export type SlateHistoryEventType = 'state_change' | 'mode_change' | 'autonomy_decision';

export interface SlateHistoryEvent {
  id: string;
  timestamp: string;
  type: SlateHistoryEventType;
  state?: RuntimeStateSnapshot;
  mode?: Mode;
  decision?: AutonomyDecision;
  source?: 'runtime' | 'user' | 'system';
}

export interface HistoryStatus {
  path: string;
  count: number;
  lastError: string | null;
}
