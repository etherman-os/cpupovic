import { describe, expect, it } from "vitest";

import { defaultSettings } from "../settings/defaultSettings";
import { deriveEngineState } from "./engineState";

describe("deriveEngineState", () => {
  it("is off when settings are disabled", () => {
    expect(
      deriveEngineState(
        { ...defaultSettings, enabled: false },
        { throttle: 0.9, spike: false, falling: false, smoothedCpuPercent: 90 },
      ),
    ).toBe("off");
  });

  it("prioritizes cooling on fast falls", () => {
    expect(
      deriveEngineState(defaultSettings, {
        throttle: 0.9,
        spike: false,
        falling: true,
        smoothedCpuPercent: 90,
      }),
    ).toBe("cooling");
  });

  it("reports redline at high throttle", () => {
    expect(
      deriveEngineState(defaultSettings, {
        throttle: 0.86,
        spike: false,
        falling: false,
        smoothedCpuPercent: 86,
      }),
    ).toBe("redline");
  });

  it("reports revving for spikes or strong throttle", () => {
    expect(
      deriveEngineState(defaultSettings, {
        throttle: 0.3,
        spike: true,
        falling: false,
        smoothedCpuPercent: 30,
      }),
    ).toBe("revving");
    expect(
      deriveEngineState(defaultSettings, {
        throttle: 0.7,
        spike: false,
        falling: false,
        smoothedCpuPercent: 70,
      }),
    ).toBe("revving");
  });

  it("reports silent below the off threshold", () => {
    expect(
      deriveEngineState(defaultSettings, {
        throttle: 0.1,
        spike: false,
        falling: false,
        smoothedCpuPercent: defaultSettings.cpuThresholdOff - 1,
      }),
    ).toBe("silent");
  });

  it("reports cruising for mid throttle above threshold", () => {
    expect(
      deriveEngineState(defaultSettings, {
        throttle: 0.4,
        spike: false,
        falling: false,
        smoothedCpuPercent: 55,
      }),
    ).toBe("cruising");
  });
});
