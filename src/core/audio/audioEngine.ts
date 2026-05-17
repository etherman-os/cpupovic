import { builtInProfiles } from "../config/builtInProfiles";
import type { SoundProfile, SyntheticSoundProfile } from "../config/profileTypes";
import type { SoundPolicyDecision } from "../policy/soundPolicy";
import type { EngineSignal } from "../signal/signalTypes";
import type { CpupovicSettings } from "../settings/settingsTypes";
import type { AudioEngineStatus } from "./audioTypes";
import { SampleHybridEngine } from "./sampleHybridEngine";
import { SyntheticEngineAudio } from "./syntheticEngine";

export function createAudioEngine(): CpupovicAudioEngine {
  return new CpupovicAudioEngine();
}

export class CpupovicAudioEngine {
  private readonly synthetic = new SyntheticEngineAudio();
  private readonly sampleHybrid = new SampleHybridEngine();
  private status: AudioEngineStatus = syntheticStatus("sport-exhaust");

  async resume(): Promise<void> {
    await Promise.all([this.synthetic.resume(), this.sampleHybrid.resume()]);
  }

  isReady(): boolean {
    return this.sampleHybrid.isReady() || this.synthetic.isReady();
  }

  update(
    signal: EngineSignal,
    decision: SoundPolicyDecision,
    settings: CpupovicSettings,
    profile: SoundProfile,
  ): void {
    if (profile.engineType === "sampleHybrid") {
      const sampleActive = this.sampleHybrid.update(signal, decision, settings, profile);
      const sampleStatus = this.sampleHybrid.getStatus();
      this.status = sampleStatus;

      if (sampleActive) {
        this.synthetic.silence();
        return;
      }

      if (sampleStatus.status === "sample-hybrid-loading") {
        this.synthetic.silence();
        return;
      }

      this.synthetic.update(signal, decision, settings, getSyntheticFallbackProfile());
      return;
    }

    this.sampleHybrid.silence();
    this.synthetic.update(signal, decision, settings, profile);
    this.status = syntheticStatus(profile.id);
  }

  async playTestSound(settings: CpupovicSettings, profile: SoundProfile): Promise<void> {
    if (profile.engineType === "sampleHybrid") {
      const samplePlayed = await this.sampleHybrid.playTestSound(settings, profile);
      this.status = this.sampleHybrid.getStatus();

      if (samplePlayed) {
        return;
      }

      await this.synthetic.playTestSound(settings, getSyntheticFallbackProfile());
      return;
    }

    await this.synthetic.playTestSound(settings, profile);
    this.status = syntheticStatus(profile.id);
  }

  getStatus(): AudioEngineStatus {
    return this.status;
  }

  dispose(): void {
    this.synthetic.dispose();
    this.sampleHybrid.dispose();
  }
}

function syntheticStatus(profileId: SoundProfile["id"]): AudioEngineStatus {
  return {
    mode: "synthetic",
    status: "synthetic-fallback",
    profileId,
    label: "Engine Sound Files Missing",
    message: "Local engine sound files are required for normal use.",
    presentAssets: [],
    missingAssets: [],
    missingRequiredAssets: [],
    missingOptionalAssets: [],
    packReadiness: "not-applicable",
  };
}

function getSyntheticFallbackProfile(): SyntheticSoundProfile {
  const profile = builtInProfiles["sport-exhaust"];

  if (profile.engineType !== "synthetic") {
    throw new Error("Sport Exhaust fallback profile must be synthetic");
  }

  return profile;
}
