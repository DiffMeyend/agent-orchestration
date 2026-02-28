export type CapacityStatus = "ok" | "overload" | "underload";

export interface CapacityInputs {
  load?: number;
  consecutiveFocusMinutes?: number;
  decisionRatePerHour?: number;
  loadStableMinutes?: number;
}

export interface CapacityTrigger {
  kind: "overload" | "underload";
  action: string;
  message: string;
}

export interface CapacityResult {
  status: CapacityStatus;
  triggers: CapacityTrigger[];
}

const OVERLOAD_TRIGGERS = {
  load: 0.9,
  focusMinutes: 90,
  decisionRate: 20
};

const UNDERLOAD_TRIGGER = {
  load: 0.3,
  durationMinutes: 30
};

export function checkCapacity(inputs: CapacityInputs): CapacityResult {
  const triggers: CapacityTrigger[] = [];

  if ((inputs.load ?? 0) > OVERLOAD_TRIGGERS.load) {
    triggers.push({
      kind: "overload",
      action: "block_new_intake",
      message: "At capacity. Complete or delegate before accepting new work."
    });
  }

  if ((inputs.consecutiveFocusMinutes ?? 0) > OVERLOAD_TRIGGERS.focusMinutes) {
    triggers.push({
      kind: "overload",
      action: "require_break",
      message: "Focus block exceeded 90 minutes. Take a 10 minute break."
    });
  }

  if ((inputs.decisionRatePerHour ?? 0) > OVERLOAD_TRIGGERS.decisionRate) {
    triggers.push({
      kind: "overload",
      action: "slow_down",
      message: "Decision fatigue risk. Batch or defer low-priority items."
    });
  }

  if (
    (inputs.load ?? 1) < UNDERLOAD_TRIGGER.load &&
    (inputs.loadStableMinutes ?? 0) >= UNDERLOAD_TRIGGER.durationMinutes
  ) {
    triggers.push({
      kind: "underload",
      action: "suggest_pull",
      message: "Capacity available. Pull the next priority item?"
    });
  }

  let status: CapacityStatus = "ok";
  if (triggers.some((t) => t.kind === "overload")) {
    status = "overload";
  } else if (triggers.some((t) => t.kind === "underload")) {
    status = "underload";
  }

  return { status, triggers };
}
