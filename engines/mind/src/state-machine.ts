export type OperatorState = "fresh" | "mid" | "faded" | "high_pressure";

export interface OperatorStateMetrics {
  sessionDurationMinutes?: number;
  decisionsMade?: number;
  errorRate?: number;
  clarifierLoopCount?: number;
  urgentTicketCount?: number;
  slaBreachImminent?: boolean;
  /** Minutes that fatigue indicators have been continuously active */
  fadedSignalMinutes?: number;
  /** Minutes since all fatigue indicators cleared */
  recoveryMinutes?: number;
  /** Minutes since high-pressure indicators cleared */
  highPressureClearMinutes?: number;
}

export interface StateTransitionOptions {
  fadedEntryDelayMinutes?: number;
  fadedRecoveryDelayMinutes?: number;
  highPressureCooldownMinutes?: number;
}

const DEFAULT_TRANSITION_OPTIONS: Required<StateTransitionOptions> = {
  fadedEntryDelayMinutes: 5,
  fadedRecoveryDelayMinutes: 15,
  highPressureCooldownMinutes: 10
};

const THRESHOLDS = {
  session: {
    freshMinutes: 30,
    fadedMinutes: 120
  },
  decisions: {
    fresh: 10,
    faded: 40
  },
  errorRate: 0.15,
  clarifierLoops: 3,
  urgentTickets: 3
};

export function isHighPressureCandidate(metrics: OperatorStateMetrics): boolean {
  return (
    (metrics.urgentTicketCount ?? 0) > THRESHOLDS.urgentTickets ||
    Boolean(metrics.slaBreachImminent)
  );
}

export function isFadedCandidate(metrics: OperatorStateMetrics): boolean {
  const sessionLong = (metrics.sessionDurationMinutes ?? 0) > THRESHOLDS.session.fadedMinutes;
  const tooManyDecisions = (metrics.decisionsMade ?? 0) > THRESHOLDS.decisions.faded;
  const errorRateHigh = (metrics.errorRate ?? 0) > THRESHOLDS.errorRate;
  const clarifierLooped = (metrics.clarifierLoopCount ?? 0) > THRESHOLDS.clarifierLoops;

  return sessionLong || tooManyDecisions || errorRateHigh || clarifierLooped;
}

export function isMidCandidate(metrics: OperatorStateMetrics): boolean {
  const sessionActive = (metrics.sessionDurationMinutes ?? 0) >= THRESHOLDS.session.freshMinutes;
  const decisionsMade = (metrics.decisionsMade ?? 0) >= THRESHOLDS.decisions.fresh;
  return sessionActive || decisionsMade;
}

export function deriveStateCandidate(metrics: OperatorStateMetrics): OperatorState {
  if (isHighPressureCandidate(metrics)) {
    return "high_pressure";
  }

  if (isFadedCandidate(metrics)) {
    return "faded";
  }

  if (isMidCandidate(metrics)) {
    return "mid";
  }

  return "fresh";
}

export function transitionState(
  currentState: OperatorState,
  metrics: OperatorStateMetrics,
  options: StateTransitionOptions = {}
): OperatorState {
  const config = { ...DEFAULT_TRANSITION_OPTIONS, ...options };
  const candidate = deriveStateCandidate(metrics);

  if (candidate === currentState) {
    return currentState;
  }

  if (candidate === "high_pressure") {
    return "high_pressure";
  }

  if (candidate === "faded" && currentState !== "faded") {
    const stability = metrics.fadedSignalMinutes;
    if (typeof stability === "number" && stability < config.fadedEntryDelayMinutes) {
      return currentState;
    }
    return "faded";
  }

  // Note: candidate !== "high_pressure" is guaranteed by line 94 check
  if ((currentState as OperatorState) === "high_pressure") {
    const cooldown = metrics.highPressureClearMinutes;
    if (typeof cooldown === "number" && cooldown < config.highPressureCooldownMinutes) {
      return "high_pressure";
    }
  }

  if (currentState === "faded" && candidate !== "faded") {
    const recovery = metrics.recoveryMinutes;
    if (typeof recovery === "number" && recovery < config.fadedRecoveryDelayMinutes) {
      return "faded";
    }
  }

  return candidate;
}
