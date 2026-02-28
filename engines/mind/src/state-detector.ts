import {
  deriveStateCandidate,
  isFadedCandidate,
  isHighPressureCandidate,
  isMidCandidate,
  type OperatorState,
  type OperatorStateMetrics
} from "./state-machine.js";

export interface DetectionInput extends OperatorStateMetrics {
  cssConfidence?: number;
}

export interface DetectionResult {
  state: OperatorState;
  confidence: number;
  indicators: string[];
  recommendedAction: string;
}

const RECOMMENDED_ACTIONS: Record<OperatorState, string> = {
  fresh: "Stay focused on planned work, hydrate, and log decisions as you go.",
  mid: "Maintain pacing, schedule quick break within the next hour.",
  faded: "Pause for recovery: take 10 minutes away from the task or hand off.",
  high_pressure: "Escalate critical items and request confirmation before executing changes."
};

const REQUIRED_INDICATORS: Record<OperatorState, number> = {
  fresh: 1,
  mid: 1,
  faded: 2,
  high_pressure: 1
};

export function detectState(input: DetectionInput): DetectionResult {
  const indicators: string[] = [];
  const candidate = deriveStateCandidate(input);

  if (isHighPressureCandidate(input)) {
    indicators.push("urgent_tickets", "sla_risk");
  } else if (isFadedCandidate(input)) {
    if ((input.sessionDurationMinutes ?? 0) > 120) {
      indicators.push("long_session");
    }
    if ((input.decisionsMade ?? 0) > 40) {
      indicators.push("decision_volume");
    }
    if ((input.errorRate ?? 0) > 0.15) {
      indicators.push("error_rate");
    }
    if ((input.clarifierLoopCount ?? 0) > 3) {
      indicators.push("clarifier_loops");
    }
  } else if (isMidCandidate(input)) {
    indicators.push("normal_operation");
  } else {
    indicators.push("session_start");
  }

  const denominator = REQUIRED_INDICATORS[candidate] || 1;
  const baseConfidence = Math.min(1, indicators.length / denominator);
  const cssConfidence = input.cssConfidence ?? 0.5;
  const confidence = Number(((baseConfidence * 0.7) + (cssConfidence * 0.3)).toFixed(2));

  return {
    state: candidate,
    confidence,
    indicators,
    recommendedAction: RECOMMENDED_ACTIONS[candidate]
  };
}
