import type { SyntheticSoundProfileId } from "../config/profileTypes";

export type EngineKind = "single-cylinder" | "inline-four" | "sport-four" | "turbine-fan";
export type EngineStroke = "two-stroke" | "four-stroke";

export type EngineResonator = {
  frequency: number;
  q: number;
  gain: number;
  rpmFollow: number;
};

export type HarmonicOrder = {
  order: number;
  gain: number;
};

export type EngineAcousticProfile = {
  id: SyntheticSoundProfileId;
  displayName: string;
  engineKind: EngineKind;
  cylinderCount: number;
  stroke: EngineStroke;
  idleRpm: number;
  maxRpm: number;
  baseGain: number;
  pulseGain: number;
  harmonicGain: number;
  noiseGain: number;
  exhaustGain: number;
  firingJitter: number;
  roughness: number;
  pulseAttackMs: number;
  pulseDecayMs: number;
  resonators: EngineResonator[];
  harmonicOrders: HarmonicOrder[];
  noise: {
    lowpassBase: number;
    lowpassMax: number;
    bandpassFrequency: number;
    bandpassQ: number;
    gain: number;
  };
  drive: {
    amount: number;
    tone: number;
  };
};

export type EngineDebugMetrics = {
  synthesisMode: "pulseEngine" | "turbineFan";
  rotationHz: number;
  firingEventsPerSecond: number;
  pulseRate: number;
  roughness: number;
  resonatorFrequencies: number[];
  harmonicFrequencies: number[];
};

export const engineAcousticProfiles: Record<SyntheticSoundProfileId, EngineAcousticProfile> = {
  "tiny-scooter": {
    id: "tiny-scooter",
    displayName: "Tiny Scooter",
    engineKind: "single-cylinder",
    cylinderCount: 1,
    stroke: "two-stroke",
    idleRpm: 1200,
    maxRpm: 7600,
    baseGain: 0.32,
    pulseGain: 0.38,
    harmonicGain: 0.08,
    noiseGain: 0.08,
    exhaustGain: 0.34,
    firingJitter: 0.006,
    roughness: 0.12,
    pulseAttackMs: 8,
    pulseDecayMs: 48,
    resonators: [
      { frequency: 210, q: 1.9, gain: 0.18, rpmFollow: 0.05 },
      { frequency: 620, q: 2.0, gain: 0.14, rpmFollow: 0.08 },
      { frequency: 1200, q: 1.4, gain: 0.06, rpmFollow: 0.1 },
    ],
    harmonicOrders: [
      { order: 1, gain: 0.24 },
      { order: 2, gain: 0.18 },
      { order: 3, gain: 0.12 },
      { order: 4, gain: 0.08 },
      { order: 6, gain: 0.04 },
    ],
    noise: {
      lowpassBase: 900,
      lowpassMax: 2800,
      bandpassFrequency: 1400,
      bandpassQ: 0.7,
      gain: 0.08,
    },
    drive: {
      amount: 0.65,
      tone: 0.54,
    },
  },
  "sport-exhaust": {
    id: "sport-exhaust",
    displayName: "Sport Exhaust",
    engineKind: "sport-four",
    cylinderCount: 4,
    stroke: "four-stroke",
    idleRpm: 850,
    maxRpm: 8200,
    baseGain: 0.36,
    pulseGain: 0.44,
    harmonicGain: 0.1,
    noiseGain: 0.06,
    exhaustGain: 0.42,
    firingJitter: 0.004,
    roughness: 0.1,
    pulseAttackMs: 9,
    pulseDecayMs: 66,
    resonators: [
      { frequency: 115, q: 1.8, gain: 0.24, rpmFollow: 0.04 },
      { frequency: 255, q: 2.0, gain: 0.18, rpmFollow: 0.07 },
      { frequency: 620, q: 1.5, gain: 0.1, rpmFollow: 0.1 },
      { frequency: 1450, q: 0.9, gain: 0.03, rpmFollow: 0.12 },
    ],
    harmonicOrders: [
      { order: 2, gain: 0.26 },
      { order: 4, gain: 0.18 },
      { order: 6, gain: 0.12 },
      { order: 8, gain: 0.08 },
      { order: 12, gain: 0.04 },
    ],
    noise: {
      lowpassBase: 650,
      lowpassMax: 3400,
      bandpassFrequency: 1050,
      bandpassQ: 0.65,
      gain: 0.06,
    },
    drive: {
      amount: 0.9,
      tone: 0.46,
    },
  },
  "jet-fan": {
    id: "jet-fan",
    displayName: "Jet Fan",
    engineKind: "turbine-fan",
    cylinderCount: 0,
    stroke: "four-stroke",
    idleRpm: 900,
    maxRpm: 8200,
    baseGain: 0.34,
    pulseGain: 0,
    harmonicGain: 0.04,
    noiseGain: 0.32,
    exhaustGain: 0,
    firingJitter: 0,
    roughness: 0.04,
    pulseAttackMs: 10,
    pulseDecayMs: 90,
    resonators: [
      { frequency: 650, q: 0.55, gain: 0.08, rpmFollow: 0.12 },
      { frequency: 1800, q: 0.45, gain: 0.05, rpmFollow: 0.16 },
    ],
    harmonicOrders: [
      { order: 1, gain: 0.035 },
      { order: 2, gain: 0.025 },
      { order: 3, gain: 0.015 },
    ],
    noise: {
      lowpassBase: 900,
      lowpassMax: 5200,
      bandpassFrequency: 1900,
      bandpassQ: 0.45,
      gain: 0.32,
    },
    drive: {
      amount: 0.05,
      tone: 0.72,
    },
  },
};

export function getEngineAcousticProfile(profileId: SyntheticSoundProfileId): EngineAcousticProfile {
  return engineAcousticProfiles[profileId];
}

export function calculateRotationHz(rpm: number): number {
  return Math.max(0, rpm) / 60;
}

export function calculateFiringRate(
  rpm: number,
  cylinderCount: number,
  stroke: EngineStroke,
): number {
  const rotationHz = calculateRotationHz(rpm);

  if (cylinderCount <= 0) {
    return 0;
  }

  return stroke === "four-stroke" ? (rotationHz * cylinderCount) / 2 : rotationHz * cylinderCount;
}

export function calculateHarmonicFrequency(rpm: number, order: number): number {
  return calculateRotationHz(rpm) * Math.max(0, order);
}

export function calculateRpmNormalized(
  rpm: number,
  idleRpm: number,
  maxRpm: number,
): number {
  if (maxRpm <= idleRpm) {
    return 0;
  }

  return clamp01((rpm - idleRpm) / (maxRpm - idleRpm));
}

export function mapResonatorFrequency(
  resonator: EngineResonator,
  rpm: number,
  idleRpm: number,
  maxRpm: number,
): number {
  const normalized = calculateRpmNormalized(rpm, idleRpm, maxRpm);

  return resonator.frequency * (1 + resonator.rpmFollow * normalized);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function clampAudioParam(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function validateEngineAcousticProfile(profile: EngineAcousticProfile): string[] {
  const errors: string[] = [];

  if (!profile.id) {
    errors.push("id is required");
  }

  if (profile.engineKind !== "turbine-fan" && profile.cylinderCount < 1) {
    errors.push("combustion profiles need at least one cylinder");
  }

  if (profile.idleRpm <= 0 || profile.maxRpm <= profile.idleRpm) {
    errors.push("idleRpm and maxRpm must be positive and ordered");
  }

  if (profile.pulseAttackMs <= 0 || profile.pulseDecayMs <= profile.pulseAttackMs) {
    errors.push("pulse envelope must have positive attack and longer decay");
  }

  if (profile.resonators.some((resonator) => resonator.frequency <= 0 || resonator.q <= 0)) {
    errors.push("resonators need positive frequency and q");
  }

  if (profile.harmonicOrders.some((harmonic) => harmonic.order <= 0 || harmonic.gain < 0)) {
    errors.push("harmonic orders need positive order and non-negative gain");
  }

  return errors;
}

export function getEngineDebugMetrics(
  profile: EngineAcousticProfile,
  rpm: number,
): EngineDebugMetrics {
  const rotationHz = calculateRotationHz(rpm);
  const firingEventsPerSecond = calculateFiringRate(rpm, profile.cylinderCount, profile.stroke);

  return {
    synthesisMode: profile.engineKind === "turbine-fan" ? "turbineFan" : "pulseEngine",
    rotationHz,
    firingEventsPerSecond,
    pulseRate: firingEventsPerSecond,
    roughness: profile.roughness,
    resonatorFrequencies: profile.resonators.map((resonator) =>
      mapResonatorFrequency(resonator, rpm, profile.idleRpm, profile.maxRpm),
    ),
    harmonicFrequencies: profile.harmonicOrders.map((harmonic) =>
      calculateHarmonicFrequency(rpm, harmonic.order),
    ),
  };
}
