import type { OperatorState } from "./state-machine.js";

export interface RegulationTool {
  id: string;
  title: string;
  prompt: string;
  action?: string;
  duration?: string;
}

const STATE_TOOL_MAP: Record<OperatorState, RegulationTool[]> = {
  fresh: [],
  mid: [
    {
      id: "pause_check",
      title: "Pause Check",
      action: "prompt_reflection",
      duration: "60 seconds",
      prompt: `PAUSE – quick reset:\n1. What am I trying to accomplish?\n2. What's blocking me right now?\n3. Is this next step intentional or reactive?`
    }
  ],
  faded: [
    {
      id: "pause_check",
      title: "Pause Check",
      action: "prompt_reflection",
      duration: "60 seconds",
      prompt: `You're approaching fatigue. Step away for 10 minutes.\n\nFocus: hydrate, stretch, and reset intent before continuing.`
    },
    {
      id: "complexity_scan",
      title: "Complexity Scan",
      action: "surface_complexity",
      prompt: `This feels stuck. Quick scan:\n[ ] Do I have enough context?\n[ ] Is this one problem or several?\n[ ] Am I the right person for it?\n[ ] What's the simplest experiment that might work?`
    }
  ],
  high_pressure: [
    {
      id: "escalation_reframe",
      title: "Escalation Reframe",
      action: "offer_escalation",
      prompt: `CRISIS MODE (while under pressure)\n- Escalation is success, not failure\n- Passing context is a skill\n- Who can help right now?\n- What's the single most important next step?`
    }
  ]
};

export function getRegulationTools(state: OperatorState): RegulationTool[] {
  return STATE_TOOL_MAP[state] ?? [];
}
