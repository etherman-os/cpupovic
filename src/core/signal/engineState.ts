import type { CpupovicSettings } from "../settings/settingsTypes";
import type { EngineSignal, EngineState } from "./signalTypes";

export function deriveEngineState(
  settings: CpupovicSettings,
  signal: Pick<EngineSignal, "throttle" | "spike" | "falling" | "smoothedCpuPercent">,
): EngineState {
  if (!settings.enabled) {
    return "off";
  }

  if (signal.falling) {
    return "cooling";
  }

  if (signal.throttle >= 0.85) {
    return "redline";
  }

  if (signal.spike || signal.throttle >= 0.62) {
    return "revving";
  }

  if (signal.smoothedCpuPercent < settings.cpuThresholdOff) {
    return "silent";
  }

  if (signal.throttle < 0.22) {
    return "idle";
  }

  return "cruising";
}
