import { listen } from "@tauri-apps/api/event";

import { isSoundProfileId } from "../core/config/builtInProfiles";
import type { TrayAction } from "../core/tray/trayTypes";

type RawTrayAction = {
  action?: string;
  value?: string;
};

export async function listenToTrayActions(handler: (action: TrayAction) => void): Promise<() => void> {
  if (!hasTauriRuntime()) {
    return () => undefined;
  }

  return listen<RawTrayAction>("tray-action", (event) => {
    const action = parseTrayAction(event.payload);

    if (action) {
      handler(action);
    }
  });
}

function parseTrayAction(raw: RawTrayAction): TrayAction | null {
  if (raw.action === "open-dashboard") {
    return { action: "open-dashboard" };
  }

  if (raw.action === "start") {
    return { action: "start" };
  }

  if (raw.action === "pause") {
    return { action: "pause" };
  }

  if (raw.action === "toggle-mute") {
    return { action: "toggle-mute" };
  }

  if (raw.action === "select-profile" && isSoundProfileId(raw.value)) {
    return { action: "select-profile", value: raw.value };
  }

  if (raw.action === "set-threshold" && typeof raw.value === "string") {
    return { action: "set-threshold", value: raw.value };
  }

  return null;
}

function hasTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
