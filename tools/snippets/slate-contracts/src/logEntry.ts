export type SlateLogLevel = 'info' | 'warn' | 'error';

export interface SlateLogEntry {
  id: string;
  timestamp: string;
  level: SlateLogLevel;
  category?: string;
  message: string;
  data?: Record<string, unknown>;
}
