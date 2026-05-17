# Settings

Settings are persistent user preferences. Runtime state is separate.

```ts
type CpupovicSettings = {
  enabled: boolean;
  muted: boolean;
  profileId: "local-engine";
  volume: number;
  cpuThresholdOn: number;
  cpuThresholdOff: number;
  smoothingMs: number;
  sensitivityCurve: number;
  idleRpm: number;
  maxRpm: number;
  revBurstEnabled: boolean;
  redlineEnabled: boolean;
  cooldownPsshEnabled: boolean;
  launchAtStartup: boolean;
  startMinimizedToTray: boolean;
  closeToTray: boolean;
  batterySaverMode: boolean;
  batterySaverThresholdPercent: number;
};
```

## Defaults

- enabled: true
- muted: false
- profileId: local-engine
- volume: 0.7
- cpuThresholdOn: 50
- cpuThresholdOff: 45
- smoothingMs: 800
- sensitivityCurve: 1.6
- idleRpm: 850
- maxRpm: 8200
- revBurstEnabled: true
- redlineEnabled: true
- cooldownPsshEnabled: true
- launchAtStartup: false
- startMinimizedToTray: true
- closeToTray: true
- batterySaverMode: false
- batterySaverThresholdPercent: 30

## Validation

- volume is clamped to 0.0 through 1.0
- CPU thresholds are clamped to 0 through 100
- cpuThresholdOff is clamped to be less than or equal to cpuThresholdOn
- idleRpm must be less than maxRpm
- sensitivityCurve is clamped to 0.5 through 3.0
- hidden legacy profile ids are migrated to `local-engine`
