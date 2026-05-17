import type {
  SampleHybridAssetKey,
  SampleHybridAssets,
  SampleHybridSoundProfileId,
  SampleHybridSoundProfile,
  SampleHybridTuning,
} from "../config/profileTypes";

type UnknownRecord = Record<string, unknown>;

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

const profileIdPattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function validateSampleHybridProfile(input: unknown): SampleHybridSoundProfile {
  const raw = requireRecord(input, "profile");
  const id = requireString(raw.id, "id");
  const displayName = requireString(raw.displayName, "displayName");
  const engineType = requireString(raw.engineType, "engineType");

  if (!isSafeSampleHybridProfileId(id)) {
    throw new Error(
      "sampleHybrid profile id must be a lowercase slug, e.g. local-engine or my-new-pack",
    );
  }

  if (engineType !== "sampleHybrid") {
    throw new Error("sampleHybrid profile must use engineType sampleHybrid");
  }

  return {
    id,
    engineType,
    name: displayName,
    displayName,
    description: requireString(raw.description, "description"),
    author: requireString(raw.author, "author"),
    license: requireString(raw.license, "license"),
    sourceUrl: readString(raw.sourceUrl),
    assets: readAssets(raw.assets),
    tuning: readTuning(raw.tuning),
  };
}

function readAssets(value: unknown): SampleHybridAssets {
  const raw = requireRecord(value, "assets");
  const assets: SampleHybridAssets = {};

  for (const assetKey of assetKeys) {
    const assetValue = raw[assetKey];

    if (typeof assetValue === "string" && assetValue.trim()) {
      const assetPath = assetValue.trim();

      if (isSafeAssetPath(assetPath)) {
        assets[assetKey] = assetPath;
      }
    }
  }

  return assets;
}

function readTuning(value: unknown): SampleHybridTuning {
  const raw = requireRecord(value, "tuning");
  const minPlaybackRate = clampNumber(raw.minPlaybackRate, 0.5, 2, 0.96);
  const maxPlaybackRate = Math.max(
    minPlaybackRate,
    clampNumber(raw.maxPlaybackRate, 0.5, 2, 1.06),
  );

  return {
    crossfadeMs: clampNumber(raw.crossfadeMs, 20, 1000, 120),
    minPlaybackRate,
    maxPlaybackRate,
    idleGain: clampNumber(raw.idleGain, 0, 1, 0.45),
    lowGain: clampNumber(raw.lowGain, 0, 1, 0.58),
    midGain: clampNumber(raw.midGain, 0, 1, 0.72),
    highGain: clampNumber(raw.highGain, 0, 1, 0.9),
    oneShotGain: clampNumber(raw.oneShotGain, 0, 1, 0.72),
    effectCooldownMs: clampNumber(raw.effectCooldownMs, 200, 5000, 900),
  };
}

function requireRecord(value: unknown, fieldName: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }

  return value as UnknownRecord;
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, numberValue));
}

export function isSafeSampleHybridProfileId(value: string): value is SampleHybridSoundProfileId {
  return profileIdPattern.test(value);
}

function isSafeAssetPath(value: string): boolean {
  return (
    !value.startsWith("/") &&
    !value.includes("..") &&
    !value.includes("\\") &&
    /^[a-zA-Z0-9/_\-.]+$/.test(value)
  );
}
