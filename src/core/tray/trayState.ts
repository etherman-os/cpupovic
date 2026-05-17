import type { SoundPolicyDecision } from "../policy/soundPolicy";
import type { EngineSignal, EngineState } from "../signal/signalTypes";
import type { CpupovicSettings } from "../settings/settingsTypes";

export type RuntimeState = {
  isRunning: boolean;
  isMuted: boolean;
  currentCpuPercent: number;
  smoothedCpuPercent: number;
  virtualRpm: number;
  engineState: EngineState;
  soundActive: boolean;
  lastPolicyReason?: SoundPolicyDecision["reason"];
  batteryPercent?: number;
};

export function createInitialRuntimeState(settings: CpupovicSettings): RuntimeState {
  return {
    isRunning: settings.enabled,
    isMuted: settings.muted,
    currentCpuPercent: 0,
    smoothedCpuPercent: 0,
    virtualRpm: settings.idleRpm,
    engineState: settings.enabled ? "silent" : "off",
    soundActive: false,
    lastPolicyReason: settings.enabled ? "below_threshold" : "disabled",
  };
}

export function runtimeStateFromSignal(
  settings: CpupovicSettings,
  previousRuntime: RuntimeState,
  signal: EngineSignal,
  policy: SoundPolicyDecision,
): RuntimeState {
  const engineState = resolveDisplayedEngineState(settings, signal, policy);

  return {
    ...previousRuntime,
    isRunning: settings.enabled,
    isMuted: settings.muted,
    currentCpuPercent: signal.rawCpuPercent,
    smoothedCpuPercent: signal.smoothedCpuPercent,
    virtualRpm: signal.virtualRpm,
    engineState,
    soundActive: policy.shouldPlayContinuousEngine,
    lastPolicyReason: policy.reason,
  };
}

function resolveDisplayedEngineState(
  settings: CpupovicSettings,
  signal: EngineSignal,
  policy: SoundPolicyDecision,
): EngineState {
  if (!settings.enabled || policy.reason === "disabled") {
    return "off";
  }

  if (policy.reason === "muted" || policy.reason === "below_threshold") {
    return signal.spike && policy.allowOneShots ? "revving" : "silent";
  }

  return signal.engineState === "silent" ? "idle" : signal.engineState;
}
