import { builtInProfileList, builtInProfiles } from "../config/builtInProfiles";
import type {
  SampleHybridSoundProfile,
  SampleHybridSoundProfileId,
  SoundProfile,
  SoundProfileId,
} from "../config/profileTypes";
import { getUserVisibleProfiles } from "../config/userProfiles";
import {
  isSafeSampleHybridProfileId,
  validateSampleHybridProfile,
} from "./soundpackValidation";

const builtInSampleHybridProfileIds: SampleHybridSoundProfileId[] = builtInProfileList
  .filter((profile): profile is SampleHybridSoundProfile => profile.engineType === "sampleHybrid")
  .map((profile) => profile.id);

export function getBuiltInProfiles(): SoundProfile[] {
  return builtInProfileList;
}

export function getVisibleSoundProfiles(profiles: SoundProfile[]): SoundProfile[] {
  return getUserVisibleProfiles(profiles);
}

export async function loadSoundProfiles(): Promise<SoundProfile[]> {
  const profileMap = new Map<SoundProfileId, SoundProfile>();
  const sampleHybridProfileIds = await loadSampleHybridProfileIds();

  for (const profile of builtInProfileList) {
    profileMap.set(profile.id, profile);
  }

  const loadedSampleProfiles = await Promise.all(
    sampleHybridProfileIds.map(async (profileId) => {
      try {
        return await loadSampleHybridProfile(profileId);
      } catch {
        return getSampleHybridFallback(profileId);
      }
    }),
  );

  for (const profile of loadedSampleProfiles) {
    if (profile) {
      profileMap.set(profile.id, profile);
    }
  }

  return Array.from(profileMap.values());
}

export function getSoundProfile(profileId: SoundProfileId): SoundProfile {
  return builtInProfiles[profileId] ?? builtInProfiles["local-engine"];
}

export async function loadSampleHybridProfile(
  profileId: SampleHybridSoundProfileId,
): Promise<SampleHybridSoundProfile> {
  const response = await fetch(`/soundpacks/${profileId}/profile.json`);

  if (!response.ok) {
    throw new Error(`Profile ${profileId} could not be loaded`);
  }

  return validateSampleHybridProfile(await response.json());
}

async function loadSampleHybridProfileIds(): Promise<SampleHybridSoundProfileId[]> {
  const manifestProfileIds = await loadSoundpackManifestProfileIds();

  return Array.from(new Set([...builtInSampleHybridProfileIds, ...manifestProfileIds]));
}

async function loadSoundpackManifestProfileIds(): Promise<SampleHybridSoundProfileId[]> {
  try {
    const response = await fetch("/soundpacks/profiles.json");

    if (!response.ok) {
      return [];
    }

    const raw = await response.json();
    let profileIds: unknown[] = [];

    if (Array.isArray(raw)) {
      profileIds = raw;
    } else if (typeof raw === "object" && raw !== null && Array.isArray(raw.profiles)) {
      profileIds = raw.profiles;
    }

    return profileIds.filter(
      (profileId): profileId is SampleHybridSoundProfileId =>
        typeof profileId === "string" && isSafeSampleHybridProfileId(profileId),
    );
  } catch {
    return [];
  }
}

function getSampleHybridFallback(
  profileId: SampleHybridSoundProfileId,
): SampleHybridSoundProfile | null {
  const fallback = builtInProfiles[profileId];

  if (!fallback || fallback.engineType !== "sampleHybrid") {
    return null;
  }

  return fallback;
}
