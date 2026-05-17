import { describe, expect, it } from "vitest";

import { defaultSettings } from "./defaultSettings";
import { validateSettings } from "./settingsValidation";

describe("validateSettings", () => {
  it("falls back to defaults for invalid input", () => {
    expect(validateSettings(null)).toEqual(defaultSettings);
  });

  it("clamps numeric settings into supported ranges", () => {
    const settings = validateSettings({
      volume: 9,
      cpuThresholdOn: 140,
      cpuThresholdOff: -20,
      smoothingMs: 12,
      sensitivityCurve: 8,
      batterySaverThresholdPercent: 300,
    });

    expect(settings.volume).toBe(1);
    expect(settings.cpuThresholdOn).toBe(100);
    expect(settings.cpuThresholdOff).toBe(95);
    expect(settings.smoothingMs).toBe(120);
    expect(settings.sensitivityCurve).toBe(3);
    expect(settings.batterySaverThresholdPercent).toBe(100);
  });

  it("derives cpuThresholdOff from cpuThresholdOn to avoid stale hysteresis bands", () => {
    const settings = validateSettings({
      cpuThresholdOn: 40,
      cpuThresholdOff: 80,
    });

    expect(settings.cpuThresholdOff).toBe(35);

    const migrated = validateSettings({
      cpuThresholdOn: 15,
      cpuThresholdOff: 0,
    });

    expect(migrated.cpuThresholdOff).toBe(10);
  });

  it("migrates hidden profiles to the local engine pack and allows future safe pack ids", () => {
    expect(validateSettings({ profileId: "jet-fan" }).profileId).toBe("local-engine");
    expect(validateSettings({ profileId: "sport-exhaust" }).profileId).toBe("local-engine");
    expect(validateSettings({ profileId: "safe-demo-engine" }).profileId).toBe("local-engine");
    expect(validateSettings({ profileId: "local-engine" }).profileId).toBe("local-engine");
    expect(validateSettings({ profileId: "supara" }).profileId).toBe("supara");
    expect(validateSettings({ profileId: "garage-engine" }).profileId).toBe("garage-engine");
    expect(validateSettings({ profileId: "../garage-engine" }).profileId).toBe("local-engine");
  });

  it("forces maxRpm above idleRpm", () => {
    const settings = validateSettings({ idleRpm: 2500, maxRpm: 2400 });

    expect(settings.maxRpm).toBeGreaterThan(settings.idleRpm);
  });
});
