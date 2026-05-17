import type { SoundPolicyReason } from "./soundPolicy";

export function getFriendlyPolicyMessage(reason: SoundPolicyReason): string {
  switch (reason) {
    case "below_threshold":
      return "Waiting: CPU is below your start level";
    case "above_threshold":
      return "Engine sound is running";
    case "muted":
      return "Muted";
    case "disabled":
      return "Paused";
    case "battery_saver":
      return "Paused for battery saver";
    case "redline":
      return "High CPU: full throttle";
    case "spike":
      return "CPU spike: rev burst";
  }
}
