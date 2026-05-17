import type { AudioEngineMode, SoundProfile, SoundProfileId } from "../config/profileTypes";

export type OneShotName = "rev_burst" | "redline_pop" | "cooldown_pssh";

export type AudioCommand = {
  profile: SoundProfile;
  gain: number;
  pitch: number;
  lowpass?: number;
  playOneShot?: OneShotName;
};

export type AudioEngineStatusKind =
  | "synthetic-fallback"
  | "sample-hybrid-active"
  | "missing-sample-assets"
  | "sample-hybrid-loading";

export type AudioEngineStatus = {
  mode: AudioEngineMode;
  status: AudioEngineStatusKind;
  profileId: SoundProfileId;
  label: string;
  message: string;
  presentAssets: string[];
  missingAssets: string[];
  missingRequiredAssets: string[];
  missingOptionalAssets: string[];
  packReadiness: "ready" | "missing-required-loops" | "missing-optional-one-shots" | "not-applicable";
};
