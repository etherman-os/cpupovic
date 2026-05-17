import type { CpupovicSettings } from "../settings/settingsTypes";
import { deriveEngineState } from "./engineState";
import { smoothValue } from "./smoothing";
import { detectCpuFall, detectCpuSpike } from "./spikeDetector";
import type { EngineSignal, SensorSample } from "./signalTypes";
import { clamp, mapCpuToVirtualRpm } from "./virtualRpm";

export function createInitialSignal(settings: CpupovicSettings): EngineSignal {
  return {
    timestampMs: Date.now(),
    rawCpuPercent: 0,
    smoothedCpuPercent: 0,
    throttle: 0,
    virtualRpm: settings.idleRpm,
    heat: 0,
    spike: false,
    falling: false,
    engineState: settings.enabled ? "silent" : "off",
  };
}

export function computeEngineSignal(
  sample: SensorSample,
  previous: EngineSignal,
  settings: CpupovicSettings,
): EngineSignal {
  const deltaMs = Math.max(1, sample.timestampMs - previous.timestampMs);
  const rawCpuPercent = clamp(sample.cpuLoadPercent, 0, 100);
  const smoothedCpuPercent = smoothValue(
    previous.smoothedCpuPercent,
    rawCpuPercent,
    deltaMs,
    settings.smoothingMs,
  );
  const throttle = clamp(smoothedCpuPercent / 100, 0, 1);
  const virtualRpm = mapCpuToVirtualRpm(
    throttle,
    settings.idleRpm,
    settings.maxRpm,
    settings.sensitivityCurve,
  );
  const spike = detectCpuSpike(previous.rawCpuPercent, rawCpuPercent, deltaMs);
  const falling = detectCpuFall(previous.smoothedCpuPercent, smoothedCpuPercent, deltaMs);
  const heat = sample.temperatureCelsius
    ? clamp((sample.temperatureCelsius - 35) / 65, 0, 1)
    : throttle;
  const partialSignal = { throttle, spike, falling, smoothedCpuPercent };

  return {
    timestampMs: sample.timestampMs,
    rawCpuPercent,
    smoothedCpuPercent,
    throttle,
    virtualRpm,
    heat,
    spike,
    falling,
    engineState: deriveEngineState(settings, partialSignal),
  };
}
