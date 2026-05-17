import type { SoundProfileId } from "../config/profileTypes";

export type TrayAction =
  | { action: "open-dashboard"; value?: undefined }
  | { action: "start"; value?: undefined }
  | { action: "pause"; value?: undefined }
  | { action: "toggle-mute"; value?: undefined }
  | { action: "select-profile"; value: SoundProfileId }
  | { action: "set-threshold"; value: string };
