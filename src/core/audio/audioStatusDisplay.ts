import type { AudioEngineStatus } from "./audioTypes";
import type { SampleHybridAssetKey, SoundProfile } from "../config/profileTypes";

export function getFriendlyEngineSoundTitle(status: AudioEngineStatus): string {
  if (status.status === "sample-hybrid-active") {
    return getPackDisplayName(status.profileId);
  }

  if (status.status === "missing-sample-assets") {
    return "Engine sound files are missing";
  }

  if (status.status === "sample-hybrid-loading") {
    return "Checking engine sound files";
  }

  return "Engine sound needs local files";
}

export function getFriendlySoundFilesStatus(status: AudioEngineStatus): string {
  if (status.status === "sample-hybrid-active") {
    return status.packReadiness === "ready"
      ? "Sound files loaded"
      : "Core sound files loaded";
  }

  if (status.status === "missing-sample-assets") {
    return "Some engine sound files are missing";
  }

  if (status.status === "sample-hybrid-loading") {
    return "Checking sound files";
  }

  return "Local engine sound files are required";
}

function getPackDisplayName(profileId: string): string {
  if (profileId === "local-engine") {
    return "Local Engine Pack";
  }

  if (profileId === "supara") {
    return "Supara Pack";
  }

  return profileId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getLoadedSoundFileNames(
  status: AudioEngineStatus,
  profile: SoundProfile | undefined,
): string[] {
  return status.presentAssets.map((assetKey) => getAssetFileName(assetKey, profile));
}

export function getMissingSoundFileNames(
  status: AudioEngineStatus,
  profile: SoundProfile | undefined,
): string[] {
  return status.missingAssets.map((assetKey) => getAssetFileName(assetKey, profile));
}

function getAssetFileName(assetKey: string, profile: SoundProfile | undefined): string {
  if (profile?.engineType !== "sampleHybrid") {
    return assetKey;
  }

  return profile.assets[assetKey as SampleHybridAssetKey] ?? assetKey;
}
