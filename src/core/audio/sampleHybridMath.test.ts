import { describe, expect, it } from "vitest";

import type { SampleHybridSoundProfile } from "../config/profileTypes";
import {
  assessSampleHybridAssets,
  calculateLayerWeights,
  calculateLayerWeightsForProfile,
  clampPlaybackRate,
  shouldPlaySampleEffect,
} from "./sampleHybridMath";

const profile: SampleHybridSoundProfile = {
  id: "safe-demo-engine",
  engineType: "sampleHybrid",
  name: "Safe Demo Engine",
  displayName: "Safe Demo Engine",
  description: "Test profile",
  author: "Test",
  license: "CC0",
  sourceUrl: "https://example.test",
  assets: {
    idle: "idle.wav",
    low: "low.wav",
    mid: "mid.wav",
    high: "high.wav",
    revBurst: "rev_burst.wav",
    cooldown: "cooldown.wav",
  },
  tuning: {
    crossfadeMs: 180,
    minPlaybackRate: 0.96,
    maxPlaybackRate: 1.06,
    idleGain: 0.4,
    lowGain: 0.56,
    midGain: 0.68,
    highGain: 0.78,
    oneShotGain: 0.68,
    effectCooldownMs: 900,
  },
};

describe("sampleHybridMath", () => {
  it("makes each loop layer dominate its target throttle band", () => {
    const idle = calculateLayerWeights(0.1);
    const low = calculateLayerWeights(0.3);
    const mid = calculateLayerWeights(0.6);
    const high = calculateLayerWeights(0.9);

    expect(idle.idle).toBeGreaterThan(idle.low);
    expect(low.low).toBeGreaterThan(low.idle);
    expect(low.low).toBeGreaterThan(low.mid);
    expect(mid.mid).toBeGreaterThan(mid.low);
    expect(high.high).toBeGreaterThan(high.mid);
    expect(Object.values(mid).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
  });

  it("crossfades at the configured band boundaries", () => {
    expect(calculateLayerWeights(0.2).low).toBe(1);
    expect(calculateLayerWeights(0.45).mid).toBe(1);
    expect(calculateLayerWeights(0.75).high).toBe(1);
  });

  it("uses Supara bands for the turbo pack", () => {
    const idle = calculateLayerWeightsForProfile("supara", 0.1);
    const low = calculateLayerWeightsForProfile("supara", 0.3);
    const mid = calculateLayerWeightsForProfile("supara", 0.6);
    const high = calculateLayerWeightsForProfile("supara", 0.9);

    expect(idle.idle).toBeGreaterThan(idle.low);
    expect(low.low).toBeGreaterThan(low.mid);
    expect(mid.mid).toBeGreaterThan(mid.high);
    expect(high.high).toBeGreaterThan(high.mid);
  });

  it("clamps playback rate inside the configured range", () => {
    expect(clampPlaybackRate(-1, 0.96, 1.06)).toBe(0.96);
    expect(clampPlaybackRate(2, 0.96, 1.06)).toBe(1.06);
    expect(clampPlaybackRate(0.5, 0.96, 1.06)).toBeCloseTo(1.01);
  });

  it("detects missing sample assets and chooses synthetic fallback when no loops exist", () => {
    const availability = assessSampleHybridAssets(profile, ["revBurst"]);

    expect(availability.canPlayContinuous).toBe(false);
    expect(availability.canPlayRevBurst).toBe(true);
    expect(availability.shouldFallbackToSynthetic).toBe(true);
    expect(availability.missingAssets).toContain("idle");
  });

  it("falls back to procedural when any required loop layer is missing", () => {
    const availability = assessSampleHybridAssets(profile, ["idle", "mid", "cooldown"]);

    expect(availability.canPlayContinuous).toBe(false);
    expect(availability.canPlayCooldown).toBe(true);
    expect(availability.shouldFallbackToSynthetic).toBe(true);
    expect(availability.missingRequiredAssets).toEqual(["low", "high"]);
    expect(availability.presentLoopAssets).toEqual(["idle", "mid"]);
  });

  it("uses sample hybrid when all required loop layers are present", () => {
    const availability = assessSampleHybridAssets(profile, ["idle", "low", "mid", "high"]);

    expect(availability.canPlayContinuous).toBe(true);
    expect(availability.shouldFallbackToSynthetic).toBe(false);
    expect(availability.readiness).toBe("missing-optional-one-shots");
    expect(availability.missingOptionalAssets).toEqual(["revBurst", "cooldown"]);
  });

  it("does not fail readiness when Supara optional effects are missing", () => {
    const suparaProfile: SampleHybridSoundProfile = {
      ...profile,
      id: "supara",
      name: "Supara Pack",
      displayName: "Supara Pack",
      assets: {
        ...profile.assets,
        antiLagPops: "anti_lag_pops.wav",
        boostSpool: "boost_spool.wav",
        burbleShort: "burble_short.wav",
        redlineBurst: "redline_burst.wav",
        revLimiter: "rev_limiter.wav",
        turboFlutter: "turbo_flutter.wav",
      },
    };
    const availability = assessSampleHybridAssets(suparaProfile, ["idle", "low", "mid", "high"]);

    expect(availability.canPlayContinuous).toBe(true);
    expect(availability.shouldFallbackToSynthetic).toBe(false);
    expect(availability.missingOptionalAssets).toContain("boostSpool");
    expect(availability.missingOptionalAssets).toContain("turboFlutter");
  });

  it("reports ready when required loops and optional one-shots are present", () => {
    const availability = assessSampleHybridAssets(profile, [
      "idle",
      "low",
      "mid",
      "high",
      "revBurst",
      "cooldown",
    ]);

    expect(availability.readiness).toBe("ready");
    expect(availability.missingRequiredAssets).toEqual([]);
    expect(availability.missingOptionalAssets).toEqual([]);
  });

  it("debounces sample effects", () => {
    expect(shouldPlaySampleEffect(10, undefined, 0.9)).toBe(true);
    expect(shouldPlaySampleEffect(10.5, 10, 0.9)).toBe(false);
    expect(shouldPlaySampleEffect(11, 10, 0.9)).toBe(true);
  });
});
