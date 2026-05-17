import { describe, expect, it } from "vitest";

import { defaultSettings } from "../settings/defaultSettings";
import type { CpupovicSettings } from "../settings/settingsTypes";
import type { RuntimeState } from "../tray/trayState";
import type { EngineSignal } from "../signal/signalTypes";
import { evaluateSoundPolicy } from "./soundPolicy";

function makeSettings(patch: Partial<CpupovicSettings> = {}): CpupovicSettings {
  return { ...defaultSettings, ...patch };
}

function makeRuntime(patch: Partial<RuntimeState> = {}): RuntimeState {
  return {
    isRunning: true,
    isMuted: false,
    currentCpuPercent: 0,
    smoothedCpuPercent: 0,
    virtualRpm: defaultSettings.idleRpm,
    engineState: "silent",
    soundActive: false,
    ...patch,
  };
}

function makeSignal(patch: Partial<EngineSignal> = {}): EngineSignal {
  return {
    timestampMs: 1000,
    rawCpuPercent: 0,
    smoothedCpuPercent: 0,
    throttle: 0,
    virtualRpm: defaultSettings.idleRpm,
    heat: 0,
    spike: false,
    falling: false,
    engineState: "silent",
    ...patch,
  };
}

describe("evaluateSoundPolicy", () => {
  it("stays silent when disabled or paused", () => {
    const disabled = evaluateSoundPolicy(
      makeSettings({ enabled: false }),
      makeRuntime(),
      makeSignal({ smoothedCpuPercent: 90 }),
    );
    const paused = evaluateSoundPolicy(
      makeSettings(),
      makeRuntime({ isRunning: false }),
      makeSignal({ smoothedCpuPercent: 90 }),
    );

    expect(disabled).toMatchObject({ shouldPlayContinuousEngine: false, reason: "disabled" });
    expect(paused).toMatchObject({ shouldPlayContinuousEngine: false, reason: "disabled" });
  });

  it("stays silent when muted", () => {
    const decision = evaluateSoundPolicy(
      makeSettings({ muted: true }),
      makeRuntime(),
      makeSignal({ smoothedCpuPercent: 90, throttle: 0.9 }),
    );

    expect(decision).toMatchObject({
      shouldPlayContinuousEngine: false,
      allowOneShots: false,
      reason: "muted",
    });
  });

  it("starts continuous sound at thresholdOn", () => {
    const decision = evaluateSoundPolicy(
      makeSettings({ cpuThresholdOn: 50, cpuThresholdOff: 45 }),
      makeRuntime({ soundActive: false }),
      makeSignal({ smoothedCpuPercent: 50, throttle: 0.5 }),
    );

    expect(decision).toMatchObject({
      shouldPlayContinuousEngine: true,
      reason: "above_threshold",
    });
  });

  it("keeps continuous sound through the hysteresis band", () => {
    const decision = evaluateSoundPolicy(
      makeSettings({ cpuThresholdOn: 50, cpuThresholdOff: 45 }),
      makeRuntime({ soundActive: true }),
      makeSignal({ smoothedCpuPercent: 47, throttle: 0.47 }),
    );

    expect(decision.shouldPlayContinuousEngine).toBe(true);
  });

  it("stops continuous sound at thresholdOff", () => {
    const decision = evaluateSoundPolicy(
      makeSettings({ cpuThresholdOn: 50, cpuThresholdOff: 45 }),
      makeRuntime({ soundActive: true }),
      makeSignal({ smoothedCpuPercent: 45, throttle: 0.45 }),
    );

    expect(decision).toMatchObject({
      shouldPlayContinuousEngine: false,
      reason: "below_threshold",
    });
  });

  it("allows a spike one-shot without forcing continuous sound below threshold", () => {
    const decision = evaluateSoundPolicy(
      makeSettings({ cpuThresholdOn: 50, cpuThresholdOff: 45, revBurstEnabled: true }),
      makeRuntime({ soundActive: false }),
      makeSignal({ smoothedCpuPercent: 28, throttle: 0.28, spike: true }),
    );

    expect(decision).toMatchObject({
      shouldPlayContinuousEngine: false,
      allowOneShots: true,
      reason: "spike",
    });
  });

  it("reports redline when continuous sound is active at high throttle", () => {
    const decision = evaluateSoundPolicy(
      makeSettings({ cpuThresholdOn: 50, cpuThresholdOff: 45 }),
      makeRuntime({ soundActive: true }),
      makeSignal({ smoothedCpuPercent: 92, throttle: 0.92 }),
    );

    expect(decision).toMatchObject({ shouldPlayContinuousEngine: true, reason: "redline" });
  });
});
