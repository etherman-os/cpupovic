import { describe, expect, it } from "vitest";

import {
  calculateFiringRate,
  calculateHarmonicFrequency,
  calculateRotationHz,
  clampAudioParam,
  engineAcousticProfiles,
  mapResonatorFrequency,
  validateEngineAcousticProfile,
} from "./engineAcousticModel";

describe("engineAcousticModel", () => {
  it("calculates rotation frequency from RPM", () => {
    expect(calculateRotationHz(3000)).toBe(50);
    expect(calculateRotationHz(-100)).toBe(0);
  });

  it("calculates four-stroke firing rate", () => {
    expect(calculateFiringRate(3000, 4, "four-stroke")).toBe(100);
  });

  it("calculates two-stroke firing rate", () => {
    expect(calculateFiringRate(3000, 1, "two-stroke")).toBe(50);
  });

  it("calculates harmonic order frequencies", () => {
    expect(calculateHarmonicFrequency(3600, 4)).toBe(240);
  });

  it("maps resonator frequency with RPM follow", () => {
    const resonator = { frequency: 200, q: 2, gain: 0.3, rpmFollow: 0.2 };

    expect(mapResonatorFrequency(resonator, 1000, 1000, 9000)).toBe(200);
    expect(mapResonatorFrequency(resonator, 9000, 1000, 9000)).toBe(240);
  });

  it("clamps audio params", () => {
    expect(clampAudioParam(-2, 0, 1)).toBe(0);
    expect(clampAudioParam(2, 0, 1)).toBe(1);
    expect(clampAudioParam(Number.NaN, 0.1, 1)).toBe(0.1);
  });

  it("keeps built-in acoustic profiles valid", () => {
    for (const profile of Object.values(engineAcousticProfiles)) {
      expect(validateEngineAcousticProfile(profile)).toEqual([]);
    }
  });
});
