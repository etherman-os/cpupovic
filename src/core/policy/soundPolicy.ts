import type { EngineSignal } from "../signal/signalTypes";
import type { CpupovicSettings } from "../settings/settingsTypes";
import type { RuntimeState } from "../tray/trayState";
import { shouldContinuousSoundStayActive } from "./thresholdPolicy";

export type SoundPolicyReason =
  | "disabled"
  | "muted"
  | "below_threshold"
  | "above_threshold"
  | "battery_saver"
  | "redline"
  | "spike";

export type SoundPolicyDecision = {
  shouldPlayContinuousEngine: boolean;
  allowOneShots: boolean;
  effectiveVolume: number;
  reason: SoundPolicyReason;
};

export function evaluateSoundPolicy(
  settings: CpupovicSettings,
  runtimeState: RuntimeState,
  engineSignal: EngineSignal,
): SoundPolicyDecision {
  if (!settings.enabled || !runtimeState.isRunning) {
    return quiet("disabled");
  }

  if (settings.muted || runtimeState.isMuted) {
    return quiet("muted");
  }

  if (
    settings.batterySaverMode &&
    typeof runtimeState.batteryPercent === "number" &&
    runtimeState.batteryPercent <= settings.batterySaverThresholdPercent
  ) {
    return quiet("battery_saver");
  }

  const thresholdAllowsContinuous = shouldContinuousSoundStayActive(
    engineSignal.smoothedCpuPercent,
    runtimeState.soundActive,
    settings.cpuThresholdOn,
    settings.cpuThresholdOff,
  );
  const currentRawCpuCanTriggerEffects = engineSignal.rawCpuPercent >= settings.cpuThresholdOn;
  const previousRawCpuStartedSound = runtimeState.currentCpuPercent >= settings.cpuThresholdOn;
  const canPlayCooldownAfterRealDrop =
    runtimeState.soundActive &&
    previousRawCpuStartedSound &&
    engineSignal.falling &&
    settings.cooldownPsshEnabled;

  if (!thresholdAllowsContinuous) {
    return {
      shouldPlayContinuousEngine: false,
      allowOneShots: canPlayCooldownAfterRealDrop,
      effectiveVolume: canPlayCooldownAfterRealDrop ? settings.volume : 0,
      reason: "below_threshold",
    };
  }

  if (engineSignal.spike && settings.revBurstEnabled && currentRawCpuCanTriggerEffects) {
    return {
      shouldPlayContinuousEngine: true,
      allowOneShots: true,
      effectiveVolume: settings.volume,
      reason: "spike",
    };
  }

  if (engineSignal.throttle >= 0.85) {
    return active(settings.volume, "redline", currentRawCpuCanTriggerEffects);
  }

  return active(settings.volume, "above_threshold", currentRawCpuCanTriggerEffects);
}

function quiet(reason: SoundPolicyReason): SoundPolicyDecision {
  return {
    shouldPlayContinuousEngine: false,
    allowOneShots: false,
    effectiveVolume: 0,
    reason,
  };
}

function active(
  effectiveVolume: number,
  reason: SoundPolicyReason,
  allowOneShots = true,
): SoundPolicyDecision {
  return {
    shouldPlayContinuousEngine: true,
    allowOneShots,
    effectiveVolume,
    reason,
  };
}
