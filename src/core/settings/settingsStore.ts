import { load } from "@tauri-apps/plugin-store";

import { defaultSettings } from "./defaultSettings";
import type { CpupovicSettings } from "./settingsTypes";
import { validateSettings } from "./settingsValidation";

const STORE_PATH = "cpupovic-settings.json";
const SETTINGS_KEY = "settings";
const LOCAL_STORAGE_KEY = "cpupovic.settings";

type TauriStore = Awaited<ReturnType<typeof load>>;

let storePromise: Promise<TauriStore | null> | null = null;

export async function loadSettings(): Promise<CpupovicSettings> {
  const store = await getStore();

  if (store) {
    const stored = await store.get<unknown>(SETTINGS_KEY);
    const settings = validateSettings(stored ?? defaultSettings);
    await store.set(SETTINGS_KEY, settings);
    await store.save();
    return settings;
  }

  return validateSettings(readLocalSettings());
}

export async function saveSettings(settings: CpupovicSettings): Promise<void> {
  const cleanSettings = validateSettings(settings);
  const store = await getStore();

  if (store) {
    await store.set(SETTINGS_KEY, cleanSettings);
    await store.save();
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanSettings));
  } catch {
    // Browser privacy modes can block localStorage. Runtime settings still work.
  }
}

async function getStore(): Promise<TauriStore | null> {
  if (!hasTauriRuntime()) {
    return null;
  }

  storePromise ??= load(STORE_PATH, {
    autoSave: 250,
    defaults: { [SETTINGS_KEY]: defaultSettings },
  }).catch(() => null);

  return storePromise;
}

function readLocalSettings(): unknown {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function hasTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
