export type SyntheticSoundProfileId = "tiny-scooter" | "sport-exhaust" | "jet-fan";
export type SampleHybridSoundProfileId = string;
export type SoundProfileId = SyntheticSoundProfileId | SampleHybridSoundProfileId;
export type AudioEngineMode = "synthetic" | "sampleHybrid";

export type OscillatorWaveform = "sine" | "square" | "sawtooth" | "triangle";

export type SyntheticSoundProfile = {
  id: SyntheticSoundProfileId;
  engineType: "synthetic";
  name: string;
  description: string;
  waveform: OscillatorWaveform;
  subWaveform: OscillatorWaveform;
  baseFrequency: number;
  pitchRange: number;
  filterBase: number;
  filterRange: number;
  gainScale: number;
  burstIntensity: number;
};

export type SampleHybridAssetKey =
  | "idle"
  | "low"
  | "mid"
  | "high"
  | "revBurst"
  | "cooldown"
  | "antiLagPops"
  | "boostSpool"
  | "burbleShort"
  | "redlineBurst"
  | "revLimiter"
  | "turboFlutter";

export type SampleHybridAssets = Partial<Record<SampleHybridAssetKey, string>>;

export type SampleHybridTuning = {
  crossfadeMs: number;
  minPlaybackRate: number;
  maxPlaybackRate: number;
  idleGain: number;
  lowGain: number;
  midGain: number;
  highGain: number;
  oneShotGain: number;
  effectCooldownMs: number;
};

export type SampleHybridSoundProfile = {
  id: SampleHybridSoundProfileId;
  engineType: "sampleHybrid";
  name: string;
  displayName: string;
  description: string;
  author: string;
  license: string;
  sourceUrl: string;
  assets: SampleHybridAssets;
  tuning: SampleHybridTuning;
};

export type SoundProfile = SyntheticSoundProfile | SampleHybridSoundProfile;
