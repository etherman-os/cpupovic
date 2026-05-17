import { invoke } from "@tauri-apps/api/core";

import type { SensorSample } from "../core/signal/signalTypes";

export type SensorSource = "system" | "demo" | "demo-fallback" | "manual-demo";
export type RuntimeMode = "tauri-native" | "browser-demo";

let lastSource: SensorSource = hasTauriRuntime() ? "system" : "demo";
let demoStartedAt = Date.now();

export async function getSensorSample(): Promise<SensorSample> {
  if (hasTauriRuntime()) {
    try {
      const sample = await invoke<SensorSample>("get_sensor_sample");
      lastSource = "system";
      return normalizeSample(sample);
    } catch {
      lastSource = "demo-fallback";
    }
  }

  return createDemoSample();
}

export function getSensorSource(): SensorSource {
  return lastSource;
}

export function getRuntimeMode(): RuntimeMode {
  return hasTauriRuntime() ? "tauri-native" : "browser-demo";
}

function createDemoSample(): SensorSample {
  const now = Date.now();
  const elapsed = (now - demoStartedAt) / 1000;
  const cruise = 32 + Math.sin(elapsed * 0.9) * 18;
  const pulse = Math.max(0, Math.sin(elapsed * 0.23)) ** 10 * 56;
  const jitter = (Math.random() - 0.5) * 7;

  return {
    timestampMs: now,
    cpuLoadPercent: Math.min(100, Math.max(0, cruise + pulse + jitter)),
  };
}

function normalizeSample(sample: SensorSample): SensorSample {
  return {
    timestampMs: Number(sample.timestampMs) || Date.now(),
    cpuLoadPercent: clamp(Number(sample.cpuLoadPercent) || 0, 0, 100),
    temperatureCelsius: sample.temperatureCelsius,
    fanRpm: sample.fanRpm,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hasTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export function resetDemoSensor(): void {
  demoStartedAt = Date.now();
}
