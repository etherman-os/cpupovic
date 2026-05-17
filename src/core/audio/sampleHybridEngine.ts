import type { SampleHybridAssetKey, SampleHybridSoundProfile } from "../config/profileTypes";
import type { SoundPolicyDecision } from "../policy/soundPolicy";
import type { EngineSignal } from "../signal/signalTypes";
import type { CpupovicSettings } from "../settings/settingsTypes";
import type { AudioEngineStatus } from "./audioTypes";
import {
  assessSampleHybridAssets,
  calculateLayerWeightsForProfile,
  clampPlaybackRate,
  getDeclaredSampleAssets,
  shouldPlaySampleEffect,
  type LoopLayerName,
} from "./sampleHybridMath";

type LoopLayer = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

type LoadedPack = {
  profileId: string;
  buffers: Partial<Record<SampleHybridAssetKey, AudioBuffer>>;
  presentAssetKeys: SampleHybridAssetKey[];
  missingAssets: SampleHybridAssetKey[];
};

const loopLayerNames: LoopLayerName[] = ["idle", "low", "mid", "high"];

export class SampleHybridEngine {
  private activated = false;
  private context?: AudioContext;
  private loading?: Promise<LoadedPack>;
  private loaded?: LoadedPack;
  private activeProfileId?: string;
  private loopLayers = new Map<LoopLayerName, LoopLayer>();
  private master?: GainNode;
  private output?: GainNode;
  private compressor?: DynamicsCompressorNode;
  private readonly lastEffectAt = new Map<SampleHybridAssetKey, number>();
  private lastTestSoundAt = 0;
  private previousThrottle = 0;
  private status: AudioEngineStatus = {
    mode: "sampleHybrid",
    status: "sample-hybrid-loading",
    profileId: "local-engine",
    label: "Checking Engine Sound",
    message: "Checking engine sound files.",
    presentAssets: [],
    missingAssets: [],
    missingRequiredAssets: [],
    missingOptionalAssets: [],
    packReadiness: "not-applicable",
  };

  async resume(): Promise<void> {
    this.activated = true;
    const context = this.ensureContext();

    if (context.state === "suspended") {
      await context.resume();
    }
  }

  isReady(): boolean {
    return this.activated && this.context?.state === "running";
  }

  update(
    signal: EngineSignal,
    decision: SoundPolicyDecision,
    settings: CpupovicSettings,
    profile: SampleHybridSoundProfile,
  ): boolean {
    if (!this.context && !this.activated) {
      this.status = loadingStatus(profile);
      return false;
    }

    const loaded = this.getLoadedOrStart(profile);

    if (!loaded) {
      return false;
    }

    const availability = assessSampleHybridAssets(profile, loaded.presentAssetKeys);

    if (availability.shouldFallbackToSynthetic) {
      this.stopLoops();
      this.status = missingStatus(profile, availability);
      return false;
    }

    this.status = {
      mode: "sampleHybrid",
      status: "sample-hybrid-active",
      profileId: profile.id,
      label: activeLabel(profile, availability),
      message:
        profile.id === "local-engine" && availability.readiness === "ready"
          ? "Local Engine Pack is ready."
        : profile.id === "local-engine"
          ? "Local Engine Pack is ready. Optional rev sounds are missing."
        : profile.id === "supara" && availability.readiness === "ready"
          ? "Supara Pack is ready."
        : profile.id === "supara"
          ? "Supara Pack is ready. Some optional effects are missing."
        : availability.readiness === "ready"
          ? "Engine sound files are loaded."
        : "Core engine sound files are loaded. Optional rev sounds are missing.",
      presentAssets: loaded.presentAssetKeys,
      missingAssets: loaded.missingAssets,
      missingRequiredAssets: availability.missingRequiredAssets,
      missingOptionalAssets: availability.missingOptionalAssets,
      packReadiness: availability.readiness,
    };

    const context = this.ensureContext();
    const now = context.currentTime;
    const targetMasterGain = decision.shouldPlayContinuousEngine
      ? decision.effectiveVolume * profile.tuning.highGain
      : 0;
    const weights = calculateLayerWeightsForProfile(profile.id, signal.throttle);
    const rate = clampPlaybackRate(
      signal.throttle,
      profile.tuning.minPlaybackRate,
      profile.tuning.maxPlaybackRate,
    );
    const rampSeconds = profile.tuning.crossfadeMs / 1000;
    const master = this.ensureMaster();

    master.gain.setTargetAtTime(targetMasterGain, now, rampSeconds);

    for (const layerName of loopLayerNames) {
      const buffer = loaded.buffers[layerName];
      const layer = buffer ? this.ensureLoopLayer(layerName, buffer) : undefined;

      if (!layer) {
        continue;
      }

      const layerGain = weights[layerName] * getLayerTuningGain(profile, layerName);
      layer.gain.gain.setTargetAtTime(layerGain, now, rampSeconds);
      layer.source.playbackRate.setTargetAtTime(rate, now, 0.2);
    }

    const effectsAllowed = settings.enabled && !settings.muted && settings.volume > 0;
    const effectVolume = decision.effectiveVolume || settings.volume * 0.55;

    if (effectsAllowed && decision.allowOneShots && signal.spike && settings.revBurstEnabled) {
      this.playEffect("revBurst", effectVolume, 0.55, profile, { durationCap: 0.9 });

      if (profile.id === "supara" && signal.throttle >= 0.42) {
        this.playEffect("boostSpool", effectVolume, getEffectCooldownSeconds(profile), profile, {
          durationCap: 1,
          gainMultiplier: 0.72,
        });
      }
    }

    if (effectsAllowed && profile.id === "supara" && settings.redlineEnabled) {
      if (
        decision.shouldPlayContinuousEngine &&
        signal.throttle >= 0.72 &&
        this.previousThrottle < 0.72
      ) {
        this.playEffect("redlineBurst", effectVolume, 2.2, profile, {
          durationCap: 0.9,
          gainMultiplier: 0.76,
        });
      }

      if (decision.shouldPlayContinuousEngine && signal.throttle >= 0.9) {
        this.playEffect("revLimiter", effectVolume, 1.35, profile, {
          durationCap: 0.75,
          gainMultiplier: 0.58,
        });
        this.playEffect("antiLagPops", effectVolume, 2.4, profile, {
          durationCap: 0.55,
          gainMultiplier: 0.46,
        });
      }
    }

    if (effectsAllowed && signal.falling && settings.cooldownPsshEnabled) {
      this.playEffect("cooldown", effectVolume, 0.65, profile, {
        durationCap: 0.8,
        gainMultiplier: 0.74,
      });

      if (profile.id === "supara") {
        this.playEffect("turboFlutter", effectVolume, getEffectCooldownSeconds(profile), profile, {
          durationCap: 0.9,
          gainMultiplier: 0.7,
        });
        this.playEffect("burbleShort", effectVolume, 1.6, profile, {
          durationCap: 0.55,
          gainMultiplier: 0.5,
          startAt: now + 0.22,
        });
      }
    }

    this.previousThrottle = signal.throttle;
    return true;
  }

  async playTestSound(
    settings: CpupovicSettings,
    profile: SampleHybridSoundProfile,
  ): Promise<boolean> {
    this.activated = true;
    const context = this.ensureContext();

    if (context.state === "suspended") {
      await context.resume();
    }

    const now = context.currentTime;

    if (settings.muted || settings.volume <= 0 || now - this.lastTestSoundAt < 2.2) {
      return true;
    }

    if (this.activeProfileId !== profile.id) {
      this.silence();
      this.stopLoops();
      this.resetEffectState();
      this.loaded = undefined;
    }

    const loaded = await this.load(profile);
    const availability = assessSampleHybridAssets(profile, loaded.presentAssetKeys);

    if (availability.shouldFallbackToSynthetic) {
      this.status = missingStatus(profile, availability);
      return false;
    }

    this.loaded = loaded;
    this.activeProfileId = profile.id;
    this.status = {
      mode: "sampleHybrid",
      status: "sample-hybrid-active",
      profileId: profile.id,
      label: activeLabel(profile, availability),
      message:
        profile.id === "local-engine"
          ? "Test Rev is using Local Engine Pack."
          : profile.id === "supara"
          ? "Test Rev is using Supara Pack."
          : "Test Rev is using engine sound files.",
      presentAssets: loaded.presentAssetKeys,
      missingAssets: loaded.missingAssets,
      missingRequiredAssets: availability.missingRequiredAssets,
      missingOptionalAssets: availability.missingOptionalAssets,
      packReadiness: availability.readiness,
    };
    this.lastTestSoundAt = now;

    this.playTestSequence(loaded, settings, profile);
    return true;
  }

  getStatus(): AudioEngineStatus {
    return this.status;
  }

  silence(): void {
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
    }
  }

  dispose(): void {
    this.silence();
    this.stopLoops();
    this.master?.disconnect();
    this.output?.disconnect();
    this.compressor?.disconnect();
    this.master = undefined;
    this.output = undefined;
    this.compressor = undefined;
  }

  private getLoadedOrStart(profile: SampleHybridSoundProfile): LoadedPack | undefined {
    if (this.loaded?.profileId === profile.id) {
      return this.loaded;
    }

    if (!this.loading || this.activeProfileId !== profile.id) {
      if (this.activeProfileId !== profile.id) {
        this.silence();
        this.stopLoops();
        this.resetEffectState();
        this.loaded = undefined;
      }

      this.loading = this.load(profile).then((loaded) => {
        this.loaded = loaded;
        this.loading = undefined;
        return loaded;
      });
      this.activeProfileId = profile.id;
      this.status = loadingStatus(profile);
    }

    return undefined;
  }

  private async load(profile: SampleHybridSoundProfile): Promise<LoadedPack> {
    const context = this.ensureContext();
    const buffers: Partial<Record<SampleHybridAssetKey, AudioBuffer>> = {};
    const presentAssetKeys: SampleHybridAssetKey[] = [];
    const missingAssets: SampleHybridAssetKey[] = [];

    for (const assetKey of getDeclaredSampleAssets(profile)) {
      const fileName = profile.assets[assetKey];

      if (!fileName) {
        continue;
      }

      try {
        const response = await fetch(`/soundpacks/${profile.id}/${fileName}`);

        if (!response.ok) {
          missingAssets.push(assetKey);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        buffers[assetKey] = await context.decodeAudioData(arrayBuffer.slice(0));
        presentAssetKeys.push(assetKey);
      } catch {
        missingAssets.push(assetKey);
      }
    }

    return {
      profileId: profile.id,
      buffers,
      presentAssetKeys,
      missingAssets,
    };
  }

  private ensureContext(): AudioContext {
    this.context ??= new AudioContext();
    return this.context;
  }

  private ensureMaster(): GainNode {
    if (this.master) {
      return this.master;
    }

    const context = this.ensureContext();
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ensureOutput());
    return this.master;
  }

  private ensureOutput(): GainNode {
    if (this.output) {
      return this.output;
    }

    const context = this.ensureContext();
    this.output = context.createGain();
    this.compressor = context.createDynamicsCompressor();
    this.output.gain.value = 0.82;
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 8;
    this.compressor.ratio.value = 10;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.16;
    this.output.connect(this.compressor);
    this.compressor.connect(context.destination);
    return this.output;
  }

  private ensureLoopLayer(layerName: LoopLayerName, buffer: AudioBuffer): LoopLayer {
    const existing = this.loopLayers.get(layerName);

    if (existing) {
      return existing;
    }

    const context = this.ensureContext();
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.ensureMaster());
    source.start();

    const layer = { source, gain };
    this.loopLayers.set(layerName, layer);
    return layer;
  }

  private playEffect(
    assetKey: SampleHybridAssetKey,
    volume: number,
    cooldownSeconds: number,
    profile: SampleHybridSoundProfile,
    options: {
      durationCap: number;
      gainMultiplier?: number;
      playbackRate?: number;
      startAt?: number;
    },
  ): void {
    const context = this.ensureContext();
    const now = context.currentTime;
    const lastPlayedAt = this.lastEffectAt.get(assetKey) ?? -Infinity;

    if (!shouldPlaySampleEffect(now, lastPlayedAt, cooldownSeconds)) {
      return;
    }

    this.lastEffectAt.set(assetKey, now);
    const buffer = this.loaded?.buffers[assetKey];

    if (buffer) {
      this.playBuffer(
        buffer,
        volume * profile.tuning.oneShotGain * (options.gainMultiplier ?? 1),
        options.playbackRate ?? 1,
        options.durationCap,
        options.startAt,
      );
    }
  }

  private playTestSequence(
    loaded: LoadedPack,
    settings: CpupovicSettings,
    profile: SampleHybridSoundProfile,
  ): void {
    const context = this.ensureContext();
    const now = context.currentTime;
    const volume = settings.volume;

    if (loaded.buffers.idle) {
      this.playBuffer(loaded.buffers.idle, volume * profile.tuning.idleGain * 0.72, 1, 0.45, now);
    }

    if (profile.id === "supara") {
      this.playSuparaTestSequence(loaded, settings, profile, now);
      return;
    }

    if (loaded.buffers.revBurst) {
      this.playBuffer(loaded.buffers.revBurst, volume * profile.tuning.highGain * 0.72, 1.02, 0.8, now + 0.34);
    }

    if (loaded.buffers.high) {
      this.playBuffer(loaded.buffers.high, volume * profile.tuning.highGain * 0.58, 1.03, 0.58, now + 0.78);
    }

    if (loaded.buffers.cooldown) {
      this.playBuffer(loaded.buffers.cooldown, volume * profile.tuning.highGain * 0.58, 0.98, 0.7, now + 1.22);
    }
  }

  private playSuparaTestSequence(
    loaded: LoadedPack,
    settings: CpupovicSettings,
    profile: SampleHybridSoundProfile,
    now: number,
  ): void {
    const volume = settings.volume;

    if (loaded.buffers.high) {
      this.playBuffer(
        loaded.buffers.high,
        volume * profile.tuning.highGain * 0.36,
        1.01,
        0.42,
        now + 0.22,
      );
    }

    this.playLoadedEffect(loaded, "revBurst", volume, profile, {
      durationCap: 0.82,
      gainMultiplier: 0.9,
      playbackRate: 1.01,
      startAt: now + 0.34,
    });
    this.playLoadedEffect(loaded, "boostSpool", volume, profile, {
      durationCap: 0.92,
      gainMultiplier: 0.78,
      startAt: now + 0.46,
    });
    this.playLoadedEffect(
      loaded,
      loaded.buffers.redlineBurst ? "redlineBurst" : "revLimiter",
      volume,
      profile,
      {
        durationCap: 0.78,
        gainMultiplier: 0.7,
        playbackRate: 1.01,
        startAt: now + 0.98,
      },
    );
    this.playLoadedEffect(loaded, "antiLagPops", volume, profile, {
      durationCap: 0.46,
      gainMultiplier: 0.44,
      startAt: now + 1.14,
    });
    this.playLoadedEffect(loaded, "cooldown", volume, profile, {
      durationCap: 0.72,
      gainMultiplier: 0.66,
      playbackRate: 0.99,
      startAt: now + 1.52,
    });
    this.playLoadedEffect(loaded, "turboFlutter", volume, profile, {
      durationCap: 0.82,
      gainMultiplier: 0.68,
      startAt: now + 1.6,
    });
    this.playLoadedEffect(loaded, "burbleShort", volume, profile, {
      durationCap: 0.48,
      gainMultiplier: 0.42,
      startAt: now + 1.92,
    });
  }

  private playLoadedEffect(
    loaded: LoadedPack,
    assetKey: SampleHybridAssetKey,
    volume: number,
    profile: SampleHybridSoundProfile,
    options: {
      durationCap: number;
      gainMultiplier?: number;
      playbackRate?: number;
      startAt?: number;
    },
  ): void {
    const buffer = loaded.buffers[assetKey];

    if (!buffer) {
      return;
    }

    this.playBuffer(
      buffer,
      volume * profile.tuning.oneShotGain * (options.gainMultiplier ?? 1),
      options.playbackRate ?? 1,
      options.durationCap,
      options.startAt,
    );
  }

  private playBuffer(
    buffer: AudioBuffer,
    volume: number,
    playbackRate: number,
    durationCap: number,
    startAt?: number,
  ): void {
    const context = this.ensureContext();
    const now = startAt ?? context.currentTime;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const duration = Math.min(buffer.duration, durationCap);
    const targetGain = Math.max(0.0001, volume);
    const fadeOutAt = now + Math.max(0.05, duration - 0.08);

    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(targetGain, now + 0.04);
    gain.gain.setTargetAtTime(0.0001, fadeOutAt, 0.035);
    source.connect(gain);
    gain.connect(this.ensureOutput());
    source.start(now);
    source.stop(now + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  private stopLoops(): void {
    for (const layer of this.loopLayers.values()) {
      try {
        layer.source.stop();
      } catch {
        // Already stopped sources can throw in some WebAudio implementations.
      }

      layer.source.disconnect();
      layer.gain.disconnect();
    }

    this.loopLayers.clear();
  }

  private resetEffectState(): void {
    this.lastEffectAt.clear();
    this.previousThrottle = 0;
  }
}

function loadingStatus(profile: SampleHybridSoundProfile): AudioEngineStatus {
  return {
    mode: "sampleHybrid",
    status: "sample-hybrid-loading",
    profileId: profile.id,
    label: "Checking Engine Sound",
    message: "Checking engine sound files.",
    presentAssets: [],
    missingAssets: [],
    missingRequiredAssets: [],
    missingOptionalAssets: [],
    packReadiness: "not-applicable",
  };
}

function missingStatus(
  profile: SampleHybridSoundProfile,
  availability: ReturnType<typeof assessSampleHybridAssets>,
): AudioEngineStatus {
  return {
    mode: "sampleHybrid",
    status: "missing-sample-assets",
    profileId: profile.id,
    label: "Engine Sound Files Missing",
    message: "Some engine sound files are missing.",
    presentAssets: availability.presentLoopAssets,
    missingAssets: availability.missingAssets,
    missingRequiredAssets: availability.missingRequiredAssets,
    missingOptionalAssets: availability.missingOptionalAssets,
    packReadiness: availability.readiness,
  };
}

function activeLabel(
  profile: SampleHybridSoundProfile,
  availability: ReturnType<typeof assessSampleHybridAssets>,
): string {
  if (profile.id === "local-engine" && availability.canPlayContinuous) {
    return "Local Engine Pack Loaded";
  }

  if (profile.id === "supara" && availability.canPlayContinuous) {
    return "Supara Pack Loaded";
  }

  return `${profile.name} Loaded`;
}

function getLayerTuningGain(profile: SampleHybridSoundProfile, layerName: LoopLayerName): number {
  switch (layerName) {
    case "idle":
      return profile.tuning.idleGain;
    case "low":
      return profile.tuning.lowGain;
    case "mid":
      return profile.tuning.midGain;
    case "high":
      return profile.tuning.highGain;
  }
}

function getEffectCooldownSeconds(profile: SampleHybridSoundProfile): number {
  return profile.tuning.effectCooldownMs / 1000;
}
