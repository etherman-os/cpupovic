import type { SoundProfileId } from "../config/profileTypes";

export type CpupovicSettings = {
  enabled: boolean;
  muted: boolean;
  profileId: SoundProfileId;
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
