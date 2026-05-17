import type { SoundProfile, SoundProfileId } from "./profileTypes";

const hiddenProfileIds = new Set(["safe-demo-engine", "tiny-scooter", "sport-exhaust", "jet-fan"]);

export const userVisibleProfileIds = ["local-engine", "supara"] as const;

export type UserVisibleProfileId = (typeof userVisibleProfileIds)[number];

export function isUserVisibleProfileId(value: unknown): value is SoundProfileId {
  return typeof value === "string" && !hiddenProfileIds.has(value);
}

export function sanitizeUserProfileId(value: unknown): SoundProfileId {
  return isSafeUserProfileId(value) ? value : "local-engine";
}

export function getUserVisibleProfiles(profiles: SoundProfile[]): SoundProfile[] {
  return profiles.filter(
    (profile) => profile.engineType === "sampleHybrid" && !hiddenProfileIds.has(profile.id),
  );
}

function isSafeUserProfileId(value: unknown): value is SoundProfileId {
  return (
    typeof value === "string" &&
    isUserVisibleProfileId(value) &&
    /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value)
  );
}
