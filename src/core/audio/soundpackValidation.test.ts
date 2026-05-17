import { describe, expect, it } from "vitest";

import { validateSampleHybridProfile } from "./soundpackValidation";

describe("validateSampleHybridProfile", () => {
  it("validates and normalizes a sample hybrid profile", () => {
    const profile = validateSampleHybridProfile({
      id: "safe-demo-engine",
      displayName: "Safe Demo Engine",
      engineType: "sampleHybrid",
      description: "Safe test pack",
      author: "Example author",
      license: "CC0",
      sourceUrl: "https://example.test/sound",
      assets: {
        idle: "idle.wav",
        high: "high.wav",
        extra: "ignored.wav",
      },
      tuning: {
        crossfadeMs: 120,
        minPlaybackRate: 0.85,
        maxPlaybackRate: 1.25,
        idleGain: 0.45,
        highGain: 0.9,
      },
    });

    expect(profile.engineType).toBe("sampleHybrid");
    expect(profile.name).toBe("Safe Demo Engine");
    expect(profile.assets).toEqual({ idle: "idle.wav", high: "high.wav" });
    expect(profile.tuning.lowGain).toBe(0.58);
    expect(profile.tuning.midGain).toBe(0.72);
  });

  it("rejects non-sample profiles", () => {
    expect(() =>
      validateSampleHybridProfile({
        id: "safe-demo-engine",
        displayName: "Safe Demo Engine",
        engineType: "synthetic",
        description: "Wrong engine",
        author: "Example author",
        license: "CC0",
        assets: {},
        tuning: {},
      }),
    ).toThrow(/engineType/);
  });

  it("accepts the local engine pack id", () => {
    const profile = validateSampleHybridProfile({
      id: "local-engine",
      displayName: "Local Engine Pack",
      engineType: "sampleHybrid",
      description: "Local legal pack",
      author: "Local user",
      license: "Documented locally",
      assets: {
        idle: "idle.wav",
        low: "low.wav",
        mid: "mid.wav",
        high: "high.wav",
      },
      tuning: {
        crossfadeMs: 180,
        minPlaybackRate: 0.96,
        maxPlaybackRate: 1.06,
        idleGain: 0.4,
        highGain: 0.78,
      },
    });

    expect(profile.id).toBe("local-engine");
    expect(profile.assets.low).toBe("low.wav");
  });

  it("validates the Supara profile with extra optional effects", () => {
    const profile = validateSampleHybridProfile({
      id: "supara",
      displayName: "Supara Pack",
      engineType: "sampleHybrid",
      description:
        "Fictional turbo tuner-style engine soundpack with boost, flutter, burble, and limiter effects.",
      author: "etherman-os",
      license: "Adobe Firefly generated output",
      sourceUrl: "",
      assets: {
        idle: "idle.wav",
        low: "low.wav",
        mid: "mid.wav",
        high: "high.wav",
        revBurst: "rev_burst.wav",
        cooldown: "cooldown.wav",
        antiLagPops: "anti_lag_pops.wav",
        boostSpool: "boost_spool.wav",
        burbleShort: "burble_short.wav",
        redlineBurst: "redline_burst.wav",
        revLimiter: "rev_limiter.wav",
        turboFlutter: "turbo_flutter.wav",
      },
      tuning: {
        crossfadeMs: 170,
        minPlaybackRate: 0.96,
        maxPlaybackRate: 1.06,
        idleGain: 0.42,
        lowGain: 0.58,
        midGain: 0.72,
        highGain: 0.86,
        oneShotGain: 0.75,
        effectCooldownMs: 900,
      },
    });

    expect(profile.id).toBe("supara");
    expect(profile.assets.boostSpool).toBe("boost_spool.wav");
    expect(profile.assets.turboFlutter).toBe("turbo_flutter.wav");
    expect(profile.tuning.oneShotGain).toBe(0.75);
  });

  it("accepts future sample pack ids that use safe slug names", () => {
    const profile = validateSampleHybridProfile({
      id: "garage-pack-2",
      displayName: "Garage Pack 2",
      engineType: "sampleHybrid",
      description: "Future local pack",
      author: "Local user",
      license: "Documented locally",
      assets: {
        idle: "loops/idle.wav",
        low: "../low.wav",
      },
      tuning: {},
    });

    expect(profile.id).toBe("garage-pack-2");
    expect(profile.assets.idle).toBe("loops/idle.wav");
    expect(profile.assets.low).toBeUndefined();
  });

  it("rejects unsafe profile ids", () => {
    expect(() =>
      validateSampleHybridProfile({
        id: "../garage-pack",
        displayName: "Garage Pack",
        engineType: "sampleHybrid",
        description: "Bad id",
        author: "Local user",
        license: "Documented locally",
        assets: {},
        tuning: {},
      }),
    ).toThrow(/lowercase slug/);
  });

  it("clamps tuning into safe ranges", () => {
    const profile = validateSampleHybridProfile({
      id: "safe-demo-engine",
      displayName: "Safe Demo Engine",
      engineType: "sampleHybrid",
      description: "Safe test pack",
      author: "Example author",
      license: "CC0",
      assets: {},
      tuning: {
        crossfadeMs: 1,
        minPlaybackRate: -10,
        maxPlaybackRate: 10,
        idleGain: -3,
        highGain: 4,
      },
    });

    expect(profile.tuning.crossfadeMs).toBe(20);
    expect(profile.tuning.minPlaybackRate).toBe(0.5);
    expect(profile.tuning.maxPlaybackRate).toBe(2);
    expect(profile.tuning.idleGain).toBe(0);
    expect(profile.tuning.lowGain).toBe(0.58);
    expect(profile.tuning.midGain).toBe(0.72);
    expect(profile.tuning.highGain).toBe(1);
    expect(profile.tuning.oneShotGain).toBe(0.72);
    expect(profile.tuning.effectCooldownMs).toBe(900);
  });
});
