import type { SyntheticSoundProfile } from "../config/profileTypes";
import type { SoundPolicyDecision } from "../policy/soundPolicy";
import type { EngineSignal } from "../signal/signalTypes";
import type { CpupovicSettings } from "../settings/settingsTypes";
import {
  calculateFiringRate,
  calculateHarmonicFrequency,
  calculateRpmNormalized,
  clamp01,
  getEngineAcousticProfile,
  mapResonatorFrequency,
  type EngineAcousticProfile,
} from "./engineAcousticModel";

type PulseEngineGraph = {
  pulseInput: GainNode;
  pulseDrive: WaveShaperNode;
  resonatorInput: GainNode;
  resonators: Array<{
    filter: BiquadFilterNode;
    gain: GainNode;
  }>;
  harmonics: Array<{
    oscillator: OscillatorNode;
    gain: GainNode;
    order: number;
    baseGain: number;
  }>;
  noise: AudioBufferSourceNode;
  noiseLowpass: BiquadFilterNode;
  noiseBandpass: BiquadFilterNode;
  noiseGain: GainNode;
  toneLowpass: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  master: GainNode;
};

type TestSoundStep = {
  offsetSeconds: number;
  durationSeconds: number;
  rpmStart: number;
  rpmEnd: number;
  throttleStart: number;
  throttleEnd: number;
};

const pulseScheduleAheadSeconds = 0.32;
const maxScheduledPulseRate = 90;

export class SyntheticEngineAudio {
  private activated = false;
  private context?: AudioContext;
  private graph?: PulseEngineGraph;
  private graphProfileId?: string;
  private nextPulseAt = 0;
  private lastRevBurstAt = 0;
  private lastRedlineAt = 0;
  private lastCooldownAt = 0;
  private lastTestSoundAt = 0;

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
    profile: SyntheticSoundProfile,
  ): void {
    const acousticProfile = getEngineAcousticProfile(profile.id);
    const wantsContinuous = decision.shouldPlayContinuousEngine;
    const wantsOneShot =
      decision.allowOneShots &&
      ((signal.spike && settings.revBurstEnabled) ||
        (wantsContinuous && signal.throttle >= 0.88 && settings.redlineEnabled) ||
        (signal.falling && settings.cooldownPsshEnabled));

    if (!this.context && !this.activated) {
      return;
    }

    if (!this.context && !wantsContinuous && !wantsOneShot) {
      return;
    }

    const context = this.ensureContext();
    const now = context.currentTime;
    const graph = this.ensureGraph(acousticProfile);
    const outputGain = wantsContinuous
      ? decision.effectiveVolume * acousticProfile.baseGain * (0.18 + signal.throttle * 0.62)
      : 0;

    updateGraph(graph, acousticProfile, signal.virtualRpm, signal.throttle, outputGain, now);

    if (wantsContinuous) {
      this.schedulePulseTrain(graph, acousticProfile, signal, now);
    } else {
      this.nextPulseAt = now + 0.04;
    }

    if (decision.allowOneShots && signal.spike && settings.revBurstEnabled) {
      this.playRevBurst(acousticProfile, decision.effectiveVolume);
    }

    if (
      decision.shouldPlayContinuousEngine &&
      signal.throttle >= 0.88 &&
      settings.redlineEnabled
    ) {
      this.playRedlineTexture(acousticProfile, decision.effectiveVolume);
    }

    if (decision.allowOneShots && signal.falling && settings.cooldownPsshEnabled) {
      this.playCooldown(acousticProfile, decision.effectiveVolume);
    }
  }

  async playTestSound(settings: CpupovicSettings, profile: SyntheticSoundProfile): Promise<void> {
    this.activated = true;
    const context = this.ensureContext();

    if (context.state === "suspended") {
      await context.resume();
    }

    const now = context.currentTime;

    if (settings.muted || settings.volume <= 0 || now - this.lastTestSoundAt < 0.8) {
      return;
    }

    this.lastTestSoundAt = now;
    const acousticProfile = getEngineAcousticProfile(profile.id);

    if (acousticProfile.engineKind === "turbine-fan") {
      this.playFanTest(acousticProfile, settings.volume);
      return;
    }

    const steps: TestSoundStep[] = [
      {
        offsetSeconds: 0,
        durationSeconds: 0.4,
        rpmStart: acousticProfile.idleRpm,
        rpmEnd: acousticProfile.idleRpm * 1.1,
        throttleStart: 0.12,
        throttleEnd: 0.16,
      },
      {
        offsetSeconds: 0.4,
        durationSeconds: 0.8,
        rpmStart: acousticProfile.idleRpm * 1.1,
        rpmEnd: acousticProfile.maxRpm * 0.72,
        throttleStart: 0.16,
        throttleEnd: 0.72,
      },
      {
        offsetSeconds: 1.2,
        durationSeconds: 0.4,
        rpmStart: acousticProfile.maxRpm * 0.72,
        rpmEnd: acousticProfile.maxRpm * 0.68,
        throttleStart: 0.72,
        throttleEnd: 0.66,
      },
      {
        offsetSeconds: 1.6,
        durationSeconds: 0.5,
        rpmStart: acousticProfile.maxRpm * 0.68,
        rpmEnd: acousticProfile.idleRpm * 1.05,
        throttleStart: 0.66,
        throttleEnd: 0.18,
      },
    ];

    for (const step of steps) {
      this.schedulePulseSegment(acousticProfile, settings.volume, now + step.offsetSeconds, step);
    }
  }

  silence(): void {
    if (!this.context || !this.graph) {
      return;
    }

    const now = this.context.currentTime;
    this.graph.master.gain.setTargetAtTime(0, now, 0.04);
    this.graph.noiseGain.gain.setTargetAtTime(0, now, 0.05);

    for (const harmonic of this.graph.harmonics) {
      harmonic.gain.gain.setTargetAtTime(0, now, 0.05);
    }
  }

  dispose(): void {
    this.silence();

    for (const harmonic of this.graph?.harmonics ?? []) {
      try {
        harmonic.oscillator.stop();
      } catch {
        // Already stopped oscillators can throw in some WebAudio implementations.
      }

      harmonic.oscillator.disconnect();
      harmonic.gain.disconnect();
    }

    if (this.graph) {
      try {
        this.graph.noise.stop();
      } catch {
        // Already stopped sources can throw in some WebAudio implementations.
      }

      this.graph.noise.disconnect();
      this.graph.noiseLowpass.disconnect();
      this.graph.noiseBandpass.disconnect();
      this.graph.noiseGain.disconnect();
      this.graph.pulseInput.disconnect();
      this.graph.pulseDrive.disconnect();
      this.graph.resonatorInput.disconnect();
      this.graph.toneLowpass.disconnect();
      this.graph.compressor.disconnect();
      this.graph.master.disconnect();

      for (const resonator of this.graph.resonators) {
        resonator.filter.disconnect();
        resonator.gain.disconnect();
      }
    }

    this.graph = undefined;
    this.graphProfileId = undefined;
  }

  private ensureContext(): AudioContext {
    this.context ??= new AudioContext();
    return this.context;
  }

  private ensureGraph(profile: EngineAcousticProfile): PulseEngineGraph {
    if (this.graph && this.graphProfileId === profile.id) {
      return this.graph;
    }

    this.dispose();
    const context = this.ensureContext();
    const pulseInput = context.createGain();
    const pulseDrive = context.createWaveShaper();
    const resonatorInput = context.createGain();
    const toneLowpass = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    const master = context.createGain();
    const resonators = profile.resonators.map((resonator) => {
      const filter = context.createBiquadFilter();
      const gain = context.createGain();

      filter.type = "bandpass";
      filter.frequency.value = resonator.frequency;
      filter.Q.value = resonator.q;
      gain.gain.value = resonator.gain * profile.exhaustGain;
      resonatorInput.connect(filter);
      filter.connect(gain);
      gain.connect(toneLowpass);

      return { filter, gain };
    });
    const harmonics = profile.harmonicOrders.map((harmonic) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = profile.engineKind === "turbine-fan" ? "triangle" : "sawtooth";
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(toneLowpass);
      oscillator.start();

      return {
        oscillator,
        gain,
        order: harmonic.order,
        baseGain: harmonic.gain,
      };
    });
    const noise = context.createBufferSource();
    const noiseLowpass = context.createBiquadFilter();
    const noiseBandpass = context.createBiquadFilter();
    const noiseGain = context.createGain();

    pulseInput.connect(pulseDrive);
    pulseDrive.curve = createDriveCurve(profile.drive.amount);
    pulseDrive.oversample = "2x";
    pulseDrive.connect(resonatorInput);
    pulseDrive.connect(toneLowpass);
    toneLowpass.type = "lowpass";
    toneLowpass.frequency.value = profile.noise.lowpassBase;
    toneLowpass.Q.value = 0.7;
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.22;
    master.gain.value = 0;
    noise.buffer = createNoiseBuffer(context, 1.4);
    noise.loop = true;
    noiseLowpass.type = "lowpass";
    noiseLowpass.frequency.value = profile.noise.lowpassBase;
    noiseBandpass.type = "bandpass";
    noiseBandpass.frequency.value = profile.noise.bandpassFrequency;
    noiseBandpass.Q.value = profile.noise.bandpassQ;
    noiseGain.gain.value = 0;
    noise.connect(noiseLowpass);
    noiseLowpass.connect(noiseBandpass);
    noiseBandpass.connect(noiseGain);
    noiseGain.connect(compressor);
    toneLowpass.connect(compressor);
    compressor.connect(master);
    master.connect(context.destination);
    noise.start();

    this.graph = {
      pulseInput,
      pulseDrive,
      resonatorInput,
      resonators,
      harmonics,
      noise,
      noiseLowpass,
      noiseBandpass,
      noiseGain,
      toneLowpass,
      compressor,
      master,
    };
    this.graphProfileId = profile.id;
    this.nextPulseAt = context.currentTime + 0.02;

    return this.graph;
  }

  private schedulePulseTrain(
    graph: PulseEngineGraph,
    profile: EngineAcousticProfile,
    signal: EngineSignal,
    now: number,
  ): void {
    if (profile.engineKind === "turbine-fan") {
      return;
    }

    const firingRate = Math.min(
      maxScheduledPulseRate,
      calculateFiringRate(signal.virtualRpm, profile.cylinderCount, profile.stroke),
    );

    if (firingRate <= 0) {
      return;
    }

    const pulseInterval = 1 / firingRate;
    const scheduleUntil = now + pulseScheduleAheadSeconds;
    this.nextPulseAt = Math.max(this.nextPulseAt, now + 0.025);

    while (this.nextPulseAt < scheduleUntil) {
      const jitter = (Math.random() * 2 - 1) * profile.firingJitter * pulseInterval;
      const amplitude = 0.52 + Math.random() * profile.roughness * 0.26;
      this.schedulePulse(
        graph,
        profile,
        this.nextPulseAt + jitter,
        signal.throttle,
        amplitude,
      );
      this.nextPulseAt += pulseInterval;
    }
  }

  private schedulePulseSegment(
    profile: EngineAcousticProfile,
    volume: number,
    startAt: number,
    step: TestSoundStep,
  ): void {
    const graph = this.ensureGraph(profile);
    const context = this.ensureContext();
    const segmentEnd = startAt + step.durationSeconds;
    let pulseAt = startAt;

    while (pulseAt < segmentEnd) {
      const progress = clamp01((pulseAt - startAt) / step.durationSeconds);
      const rpm = lerp(step.rpmStart, step.rpmEnd, progress);
      const throttle = lerp(step.throttleStart, step.throttleEnd, progress);
      const firingRate = Math.min(
        maxScheduledPulseRate,
        calculateFiringRate(rpm, profile.cylinderCount, profile.stroke),
      );
      const interval = firingRate > 0 ? 1 / firingRate : 0.08;
      const amplitude = volume * (0.36 + throttle * 0.32);

      updateGraph(graph, profile, rpm, throttle, volume * profile.baseGain, pulseAt);
      this.schedulePulse(graph, profile, pulseAt, throttle, amplitude);
      pulseAt += interval;
    }

    graph.master.gain.setValueAtTime(0.0001, startAt);
    graph.master.gain.linearRampToValueAtTime(volume * profile.baseGain * 0.72, startAt + 0.08);
    graph.master.gain.setTargetAtTime(0, context.currentTime + 2.08, 0.08);
  }

  private schedulePulse(
    graph: PulseEngineGraph,
    profile: EngineAcousticProfile,
    when: number,
    throttle: number,
    amplitude: number,
  ): void {
    const context = this.ensureContext();
    const source = context.createBufferSource();
    const gain = context.createGain();
    const pulseDuration = Math.min(0.16, profile.pulseDecayMs / 1000 + 0.045);

    source.buffer = createPulseBuffer(context, profile, pulseDuration);
    source.connect(gain);
    gain.connect(graph.pulseInput);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, profile.pulseGain * amplitude * (0.36 + throttle * 0.42)),
      when + profile.pulseAttackMs / 1000,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, when + pulseDuration);
    source.start(when);
    source.stop(when + pulseDuration + 0.015);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  private playRevBurst(profile: EngineAcousticProfile, volume: number): void {
    const context = this.ensureContext();
    const now = context.currentTime;

    if (now - this.lastRevBurstAt < 0.55) {
      return;
    }

    this.lastRevBurstAt = now;

    if (profile.engineKind === "turbine-fan") {
      this.playFanWhoosh(profile, volume, 0.42, 0.55);
      return;
    }

    this.schedulePulseSegment(profile, volume, now, {
      offsetSeconds: 0,
      durationSeconds: 0.3,
      rpmStart: profile.idleRpm * 1.5,
      rpmEnd: profile.maxRpm * 0.75,
      throttleStart: 0.35,
      throttleEnd: 0.86,
    });
  }

  private playRedlineTexture(profile: EngineAcousticProfile, volume: number): void {
    const context = this.ensureContext();
    const now = context.currentTime;

    if (now - this.lastRedlineAt < 0.9) {
      return;
    }

    this.lastRedlineAt = now;

    if (profile.engineKind === "turbine-fan") {
      this.playFanWhoosh(profile, volume, 0.34, 0.72);
      return;
    }

    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = createNoiseBuffer(context, 0.12);
    highpass.type = "highpass";
    highpass.frequency.value = 760;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 2400;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045 * volume, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(context.destination);
    source.start(now);
    source.stop(now + 0.14);
    source.onended = () => {
      source.disconnect();
      highpass.disconnect();
      lowpass.disconnect();
      gain.disconnect();
    };
  }

  private playCooldown(profile: EngineAcousticProfile, volume: number): void {
    const context = this.ensureContext();
    const now = context.currentTime;

    if (now - this.lastCooldownAt < 0.9) {
      return;
    }

    this.lastCooldownAt = now;
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = createNoiseBuffer(context, 0.32);
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(profile.engineKind === "turbine-fan" ? 760 : 900, now);
    highpass.frequency.exponentialRampToValueAtTime(340, now + 0.26);
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(profile.engineKind === "turbine-fan" ? 3600 : 2600, now);
    lowpass.frequency.exponentialRampToValueAtTime(1100, now + 0.3);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.065 * volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(context.destination);
    source.start(now);
    source.stop(now + 0.34);
    source.onended = () => {
      source.disconnect();
      highpass.disconnect();
      lowpass.disconnect();
      gain.disconnect();
    };
  }

  private playFanTest(profile: EngineAcousticProfile, volume: number): void {
    const context = this.ensureContext();
    const now = context.currentTime;
    this.playFanWhoosh(profile, volume, 1.6, 0.7);

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const lowpass = context.createBiquadFilter();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(70, now);
    oscillator.frequency.setTargetAtTime(130, now + 0.45, 0.55);
    oscillator.frequency.setTargetAtTime(85, now + 1.25, 0.45);
    lowpass.type = "lowpass";
    lowpass.frequency.value = 420;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055 * volume, now + 0.28);
    gain.gain.setTargetAtTime(0.0001, now + 1.45, 0.08);
    oscillator.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 1.75);
    oscillator.onended = () => {
      oscillator.disconnect();
      lowpass.disconnect();
      gain.disconnect();
    };
  }

  private playFanWhoosh(
    profile: EngineAcousticProfile,
    volume: number,
    durationSeconds: number,
    intensity: number,
  ): void {
    const context = this.ensureContext();
    const now = context.currentTime;
    const source = context.createBufferSource();
    const bandpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = createNoiseBuffer(context, durationSeconds);
    bandpass.type = "bandpass";
    bandpass.Q.value = profile.noise.bandpassQ;
    bandpass.frequency.setValueAtTime(profile.noise.bandpassFrequency, now);
    bandpass.frequency.setTargetAtTime(profile.noise.bandpassFrequency * 1.28, now + 0.2, 0.34);
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(profile.noise.lowpassBase, now);
    lowpass.frequency.setTargetAtTime(profile.noise.lowpassMax, now + 0.2, 0.35);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12 * volume * intensity, now + 0.16);
    gain.gain.setTargetAtTime(0.0001, now + durationSeconds * 0.82, 0.08);
    source.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(context.destination);
    source.start(now);
    source.stop(now + durationSeconds + 0.02);
    source.onended = () => {
      source.disconnect();
      bandpass.disconnect();
      lowpass.disconnect();
      gain.disconnect();
    };
  }
}

function updateGraph(
  graph: PulseEngineGraph,
  profile: EngineAcousticProfile,
  rpm: number,
  throttle: number,
  outputGain: number,
  atTime: number,
): void {
  const normalized = calculateRpmNormalized(rpm, profile.idleRpm, profile.maxRpm);
  const toneFrequency = lerp(profile.noise.lowpassBase, profile.noise.lowpassMax, normalized);
  const noiseGain = outputGain * profile.noise.gain * (0.28 + throttle * 0.5);

  graph.pulseDrive.curve = createDriveCurve(profile.drive.amount * (0.65 + throttle * 0.55));
  graph.toneLowpass.frequency.setTargetAtTime(toneFrequency, atTime, 0.16);
  graph.noiseLowpass.frequency.setTargetAtTime(toneFrequency, atTime, 0.2);
  graph.noiseBandpass.frequency.setTargetAtTime(
    profile.noise.bandpassFrequency * (1 + normalized * 0.38),
    atTime,
    0.24,
  );
  graph.noiseGain.gain.setTargetAtTime(noiseGain, atTime, 0.16);
  graph.master.gain.setTargetAtTime(outputGain, atTime, 0.12);

  for (let index = 0; index < graph.resonators.length; index += 1) {
    const resonator = profile.resonators[index];
    const graphResonator = graph.resonators[index];

    graphResonator.filter.frequency.setTargetAtTime(
      mapResonatorFrequency(resonator, rpm, profile.idleRpm, profile.maxRpm),
      atTime,
      0.18,
    );
    graphResonator.gain.gain.setTargetAtTime(
      resonator.gain * profile.exhaustGain * (0.55 + throttle * 0.45),
      atTime,
      0.16,
    );
  }

  for (const harmonic of graph.harmonics) {
    const frequency = calculateHarmonicFrequency(rpm, harmonic.order);
    harmonic.oscillator.frequency.setTargetAtTime(Math.max(18, frequency), atTime, 0.18);
    harmonic.gain.gain.setTargetAtTime(
      outputGain * profile.harmonicGain * harmonic.baseGain * (0.22 + throttle * 0.5),
      atTime,
      0.18,
    );
  }
}

function createPulseBuffer(
  context: AudioContext,
  profile: EngineAcousticProfile,
  durationSeconds: number,
): AudioBuffer {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  const attackSamples = Math.max(1, Math.floor((profile.pulseAttackMs / 1000) * context.sampleRate));
  const decaySeconds = Math.max(0.005, profile.pulseDecayMs / 1000);

  for (let index = 0; index < frameCount; index += 1) {
    const seconds = index / context.sampleRate;
    const attack = index < attackSamples ? index / attackSamples : 1;
    const decay = Math.exp(-seconds / decaySeconds);
    const normalized = index / Math.max(1, frameCount - 1);
    const softBody = 1 - normalized * 0.62;
    const rasp = Math.sin(normalized * Math.PI * 3.5) * profile.roughness * 0.08;
    const grit = (Math.random() * 2 - 1) * profile.roughness * 0.05;

    data[index] = (attack * decay * softBody + rasp * decay + grit * decay) * 0.42;
  }

  return buffer;
}

function createNoiseBuffer(context: AudioContext, durationSeconds: number): AudioBuffer {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;

  for (let index = 0; index < frameCount; index += 1) {
    previous = previous * 0.76 + (Math.random() * 2 - 1) * 0.24;
    data[index] = Math.max(-1, Math.min(1, previous * 2.2));
  }

  return buffer;
}

function createDriveCurve(amount: number): Float32Array {
  const sampleCount = 512;
  const curve = new Float32Array(sampleCount);
  const drive = Math.max(0, amount);

  for (let index = 0; index < sampleCount; index += 1) {
    const x = (index / (sampleCount - 1)) * 2 - 1;
    curve[index] = ((1 + drive) * x) / (1 + drive * Math.abs(x));
  }

  return curve;
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * clamp01(amount);
}
