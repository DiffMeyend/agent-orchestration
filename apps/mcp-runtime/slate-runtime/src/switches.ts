import type { Mode } from 'slate-contracts';
export type { Mode } from 'slate-contracts';

let currentMode: Mode = 'quiet';

export function getMode(): Mode {
  return currentMode;
}

export function setMode(mode: Mode): Mode {
  currentMode = mode;
  return currentMode;
}
