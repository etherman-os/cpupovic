import type { CpupovicSettings } from "./settingsTypes";

export const defaultSettings: CpupovicSettings = {
  enabled: true,
  muted: false,
  profileId: "local-engine",
  volume: 0.7,
  cpuThresholdOn: 50,
  cpuThresholdOff: 45,
  smoothingMs: 800,
  sensitivityCurve: 1.6,
  idleRpm: 850,
  maxRpm: 8200,
  revBurstEnabled: true,
  redlineEnabled: true,
  cooldownPsshEnabled: true,
  launchAtStartup: false,
  startMinimizedToTray: true,
  closeToTray: true,
  batterySaverMode: false,
  batterySaverThresholdPercent: 30,
};
