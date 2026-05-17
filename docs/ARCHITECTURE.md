# CPUpovic Architecture

CPUpovic is a desktop toy app that turns system activity into ridiculous engine-like sound.

## Core Principle

The app does not try to emulate a real car engine. It maps computer activity signals into a virtual RPM curve and drives an audio engine from that virtual RPM.

## Pipeline

```txt
SensorSample -> SignalEngine -> SoundPolicy -> AudioEngine -> UI / Tray State
```

## Separation

- Settings: persistent user preferences
- RuntimeState: current app state
- SensorSample: raw operating system data
- EngineSignal: processed CPU/RPM data
- SoundPolicy: decision for whether sound should play
- AudioEngine: sound generation
- TrayController: quick native actions

## SensorSample

```ts
type SensorSample = {
  timestampMs: number;
  cpuLoadPercent: number;
  temperatureCelsius?: number;
  fanRpm?: number;
};
```

Required now:

- CPU load percentage

If real CPU sampling is unavailable, the frontend falls back to demo CPU samples and the dashboard sensor status shows `demo fallback`.

Optional future sources:

- CPU/GPU temperature
- Fan RPM
- Battery state
- Manual demo mode

## EngineSignal

```ts
type EngineSignal = {
  throttle: number;
  virtualRpm: number;
  heat: number;
  spike: boolean;
  falling: boolean;
};
```

CPU is smoothed before it becomes throttle. Virtual RPM uses:

```txt
virtualRpm = idleRpm + pow(cpuNormalized, curve) * (maxRpm - idleRpm)
```

## Engine States

- off
- silent
- idle
- cruising
- revving
- redline
- cooling

## Sound Policy

Sound policy is intentionally separate from signal processing. CPU can be high, but the app may still stay silent because the user paused, muted, enabled battery saver, or configured a higher threshold.

The CPU threshold uses hysteresis:

```txt
Start sound when smoothed CPU >= cpuThresholdOn
Stop sound when smoothed CPU <= cpuThresholdOff
```

The same threshold helper is covered by unit tests and is used by sound policy so the UI and audio behavior do not drift.

## Audio Design

The normal user-facing sound path uses sample-based Sound Packs:

```txt
public/soundpacks/local-engine/
public/soundpacks/supara/
```

Each pack provides `idle`, `low`, `mid`, and `high` loop layers, plus optional rev/cooldown and pack-specific effects. CPU load drives the layer crossfade and volume.

Procedural/synthetic audio still exists internally for development and missing-file fallback, but it is not exposed as a normal sound choice.

## Legal Rule

The project must not use vehicle brand names, exhaust brand logos, or copyrighted engine recordings.
