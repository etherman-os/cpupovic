import { invoke } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

export type AutostartSyncResult = {
  supported: boolean;
  enabled: boolean;
};

export async function readLaunchAtStartup(): Promise<AutostartSyncResult> {
  if (!hasTauriRuntime()) {
    return { supported: false, enabled: false };
  }

  try {
    return { supported: true, enabled: await isEnabled() };
  } catch {
    return { supported: false, enabled: false };
  }
}

export async function syncLaunchAtStartup(shouldEnable: boolean): Promise<AutostartSyncResult> {
  if (!hasTauriRuntime()) {
    return { supported: false, enabled: shouldEnable };
  }

  try {
    if (shouldEnable) {
      await enable();
    } else {
      await disable();
    }

    return { supported: true, enabled: await isEnabled() };
  } catch {
    return { supported: false, enabled: shouldEnable };
  }
}

export async function syncCloseToTray(closeToTray: boolean): Promise<void> {
  if (!hasTauriRuntime()) {
    return;
  }

  await invoke("set_close_to_tray", { closeToTray }).catch(() => undefined);
}

function hasTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
