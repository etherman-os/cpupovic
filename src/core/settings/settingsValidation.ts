import { sanitizeUserProfileId } from "../config/userProfiles";
import { getAutomaticThresholdOff } from "../policy/thresholdPolicy";
import { defaultSettings } from "./defaultSettings";
import { settingsLimits } from "./settingsSchema";
import type { CpupovicSettings } from "./settingsTypes";

type UnknownRecord = Record<string, unknown>;

export function validateSettings(input: unknown): CpupovicSettings {
  const raw = isRecord(input) ? input : {};
  const cpuThresholdOn = clampNumber(
    raw.cpuThresholdOn,
    settingsLimits.cpuThreshold.min,
    settingsLimits.cpuThreshold.max,
    defaultSettings.cpuThresholdOn,
  );
  const cpuThresholdOff = getAutomaticThresholdOff(cpuThresholdOn);
  const idleRpm = clampNumber(
    raw.idleRpm,
    settingsLimits.idleRpm.min,
    settingsLimits.idleRpm.max,
    defaultSettings.idleRpm,
  );
  const requestedMaxRpm = clampNumber(
    raw.maxRpm,
    settingsLimits.maxRpm.min,
    settingsLimits.maxRpm.max,
    defaultSettings.maxRpm,
  );
  const maxRpm = requestedMaxRpm > idleRpm ? requestedMaxRpm : idleRpm + 1000;

  return {
    enabled: readBoolean(raw.enabled, defaultSettings.enabled),
    muted: readBoolean(raw.muted, defaultSettings.muted),
    profileId: sanitizeUserProfileId(raw.profileId),
    volume: clampNumber(
      raw.volume,
      settingsLimits.volume.min,
      settingsLimits.volume.max,
      defaultSettings.volume,
    ),
    cpuThresholdOn,
    cpuThresholdOff,
    smoothingMs: clampNumber(
      raw.smoothingMs,
      settingsLimits.smoothingMs.min,
      settingsLimits.smoothingMs.max,
      defaultSettings.smoothingMs,
    ),
    sensitivityCurve: clampNumber(
      raw.sensitivityCurve,
      settingsLimits.sensitivityCurve.min,
      settingsLimits.sensitivityCurve.max,
      defaultSettings.sensitivityCurve,
    ),
    idleRpm,
    maxRpm,
    revBurstEnabled: readBoolean(raw.revBurstEnabled, defaultSettings.revBurstEnabled),
    redlineEnabled: readBoolean(raw.redlineEnabled, defaultSettings.redlineEnabled),
    cooldownPsshEnabled: readBoolean(raw.cooldownPsshEnabled, defaultSettings.cooldownPsshEnabled),
    launchAtStartup: readBoolean(raw.launchAtStartup, defaultSettings.launchAtStartup),
    startMinimizedToTray: readBoolean(
      raw.startMinimizedToTray,
      defaultSettings.startMinimizedToTray,
    ),
    closeToTray: readBoolean(raw.closeToTray, defaultSettings.closeToTray),
    batterySaverMode: readBoolean(raw.batterySaverMode, defaultSettings.batterySaverMode),
    batterySaverThresholdPercent: clampNumber(
      raw.batterySaverThresholdPercent,
      settingsLimits.batterySaverThresholdPercent.min,
      settingsLimits.batterySaverThresholdPercent.max,
      defaultSettings.batterySaverThresholdPercent,
    ),
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, numberValue));
}
