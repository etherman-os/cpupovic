import type { SampleHybridAssetKey, SampleHybridSoundProfile } from "../config/profileTypes";

export type LoopLayerName = "idle" | "low" | "mid" | "high";

export type LayerWeights = Record<LoopLayerName, number>;

export type SampleAssetAvailability = {
  presentLoopAssets: LoopLayerName[];
  missingRequiredAssets: LoopLayerName[];
  missingOptionalAssets: SampleHybridAssetKey[];
  missingAssets: SampleHybridAssetKey[];
  canPlayContinuous: boolean;
  canPlayRevBurst: boolean;
  canPlayCooldown: boolean;
  shouldFallbackToSynthetic: boolean;
  readiness: "ready" | "missing-required-loops" | "missing-optional-one-shots";
};

export const requiredLoopLayerNames: LoopLayerName[] = ["idle", "low", "mid", "high"];
export const optionalOneShotNames: SampleHybridAssetKey[] = [
  "revBurst",
  "cooldown",
  "antiLagPops",
  "boostSpool",
  "burbleShort",
  "redlineBurst",
  "revLimiter",
  "turboFlutter",
];
const loopLayerNames: LoopLayerName[] = requiredLoopLayerNames;
const assetKeys: SampleHybridAssetKey[] = [
  "idle",
  "low",
  "mid",
  "high",
  "revBurst",
  "cooldown",
  "antiLagPops",
  "boostSpool",
  "burbleShort",
  "redlineBurst",
  "revLimiter",
  "turboFlutter",
];

export function calculateLayerWeights(throttle: number): LayerWeights {
  return calculateLayerWeightsWithBands(throttle, {
    idleFullEnd: 0.14,
    idleLowEnd: 0.2,
    lowFullEnd: 0.39,
    lowMidEnd: 0.45,
    midFullEnd: 0.69,
    midHighEnd: 0.75,
  });
}

export function calculateLayerWeightsForProfile(profileId: string, throttle: number): LayerWeights {
  if (profileId === "supara") {
    return calculateLayerWeightsWithBands(throttle, {
      idleFullEnd: 0.16,
      idleLowEnd: 0.22,
      lowFullEnd: 0.39,
      lowMidEnd: 0.45,
      midFullEnd: 0.69,
      midHighEnd: 0.75,
    });
  }

  return calculateLayerWeights(throttle);
}

function calculateLayerWeightsWithBands(
  throttle: number,
  bands: {
    idleFullEnd: number;
    idleLowEnd: number;
    lowFullEnd: number;
    lowMidEnd: number;
    midFullEnd: number;
    midHighEnd: number;
  },
): LayerWeights {
  const cleanThrottle = clamp(throttle, 0, 1);

  if (cleanThrottle < bands.idleFullEnd) {
    return { idle: 1, low: 0, mid: 0, high: 0 };
  }

  if (cleanThrottle < bands.idleLowEnd) {
    const mix = smoothstep(bands.idleFullEnd, bands.idleLowEnd, cleanThrottle);
    return { idle: 1 - mix, low: mix, mid: 0, high: 0 };
  }

  if (cleanThrottle < bands.lowFullEnd) {
    return { idle: 0, low: 1, mid: 0, high: 0 };
  }

  if (cleanThrottle < bands.lowMidEnd) {
    const mix = smoothstep(bands.lowFullEnd, bands.lowMidEnd, cleanThrottle);
    return { idle: 0, low: 1 - mix, mid: mix, high: 0 };
  }

  if (cleanThrottle < bands.midFullEnd) {
    return { idle: 0, low: 0, mid: 1, high: 0 };
  }

  if (cleanThrottle < bands.midHighEnd) {
    const mix = smoothstep(bands.midFullEnd, bands.midHighEnd, cleanThrottle);
    return { idle: 0, low: 0, mid: 1 - mix, high: mix };
  }

  return { idle: 0, low: 0, mid: 0, high: 1 };
}

export function clampPlaybackRate(
  throttle: number,
  minPlaybackRate: number,
  maxPlaybackRate: number,
): number {
  const minRate = Math.min(minPlaybackRate, maxPlaybackRate);
  const maxRate = Math.max(minPlaybackRate, maxPlaybackRate);
  const rate = minRate + clamp(throttle, 0, 1) * (maxRate - minRate);

  return clamp(rate, minRate, maxRate);
}

export function assessSampleHybridAssets(
  profile: SampleHybridSoundProfile,
  presentAssetKeys: Iterable<SampleHybridAssetKey>,
): SampleAssetAvailability {
  const present = new Set(presentAssetKeys);
  const declared = new Set(
    assetKeys.filter((assetKey) => typeof profile.assets[assetKey] === "string"),
  );
  const missingAssets = assetKeys.filter(
    (assetKey) => declared.has(assetKey) && !present.has(assetKey),
  );
  const presentLoopAssets = loopLayerNames.filter((assetKey) => present.has(assetKey));
  const missingRequiredAssets = requiredLoopLayerNames.filter((assetKey) => !present.has(assetKey));
  const missingOptionalAssets = optionalOneShotNames.filter(
    (assetKey) => declared.has(assetKey) && !present.has(assetKey),
  );
  const canPlayContinuous = missingRequiredAssets.length === 0;
  const readiness = !canPlayContinuous
    ? "missing-required-loops"
    : missingOptionalAssets.length > 0
      ? "missing-optional-one-shots"
      : "ready";

  return {
    presentLoopAssets,
    missingRequiredAssets,
    missingOptionalAssets,
    missingAssets,
    canPlayContinuous,
    canPlayRevBurst: present.has("revBurst"),
    canPlayCooldown: present.has("cooldown"),
    shouldFallbackToSynthetic: !canPlayContinuous,
    readiness,
  };
}

export function getDeclaredSampleAssets(profile: SampleHybridSoundProfile): SampleHybridAssetKey[] {
  return assetKeys.filter((assetKey) => typeof profile.assets[assetKey] === "string");
}

export function shouldPlaySampleEffect(
  nowSeconds: number,
  lastPlayedAtSeconds: number | undefined,
  cooldownSeconds: number,
): boolean {
  return typeof lastPlayedAtSeconds !== "number" || nowSeconds - lastPlayedAtSeconds >= cooldownSeconds;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const amount = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
