import { invoke } from "@tauri-apps/api/core";

import type { SoundProfileId } from "../core/config/profileTypes";

export type TrayStatusPayload = {
  running: boolean;
  muted: boolean;
  profileId: SoundProfileId;
  cpuThresholdOn: number;
  cpuThresholdOff: number;
};

export async function showDashboard(): Promise<void> {
  await invoke("show_dashboard").catch(() => undefined);
}

export async function hideDashboard(): Promise<void> {
  await invoke("hide_dashboard").catch(() => undefined);
}

export async function quitApp(): Promise<void> {
  await invoke("quit_app").catch(() => undefined);
}

export async function updateTrayStatus(status: TrayStatusPayload): Promise<void> {
  if (!hasTauriRuntime()) {
    return;
  }

  await invoke("update_tray_status", { status }).catch(() => undefined);
}

function hasTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
