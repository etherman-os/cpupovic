import type { CpupovicSettings } from "../settings/settingsTypes";

export function isBatterySaverBlocking(
  settings: CpupovicSettings,
  batteryPercent?: number,
): boolean {
  return (
    settings.batterySaverMode &&
    typeof batteryPercent === "number" &&
    batteryPercent <= settings.batterySaverThresholdPercent
  );
}
