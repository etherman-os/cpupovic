import { useCallback, useEffect, useRef, useState } from "react";

import { getSensorSample } from "./bindings/sensorClient";
import {
  readLaunchAtStartup,
  syncCloseToTray,
  syncLaunchAtStartup,
} from "./bindings/settingsClient";
import { listenToTrayActions } from "./bindings/tauriEvents";
import { updateTrayStatus } from "./bindings/trayClient";
import { createAudioEngine } from "./core/audio/audioEngine";
import type { AudioEngineStatus } from "./core/audio/audioTypes";
import {
  getBuiltInProfiles,
  getSoundProfile,
  getVisibleSoundProfiles,
  loadSoundProfiles,
} from "./core/audio/soundpackLoader";
import type { SoundPolicyDecision } from "./core/policy/soundPolicy";
import { evaluateSoundPolicy } from "./core/policy/soundPolicy";
import { getAutomaticThresholdOff } from "./core/policy/thresholdPolicy";
import { computeEngineSignal, createInitialSignal } from "./core/signal/signalEngine";
import type { EngineSignal } from "./core/signal/signalTypes";
import { defaultSettings } from "./core/settings/defaultSettings";
import { loadSettings, saveSettings } from "./core/settings/settingsStore";
import type { CpupovicSettings } from "./core/settings/settingsTypes";
import { validateSettings } from "./core/settings/settingsValidation";
import type { TrayAction } from "./core/tray/trayTypes";
import {
  createInitialRuntimeState,
  runtimeStateFromSignal,
  type RuntimeState,
} from "./core/tray/trayState";
import { Dashboard } from "./ui/components/Dashboard";
import "./styles.css";

const initialSignal = createInitialSignal(defaultSettings);
const initialRuntime = createInitialRuntimeState(defaultSettings);
const initialPolicy = evaluateSoundPolicy(defaultSettings, initialRuntime, initialSignal);
const defaultDemoCpuPercent = 5;
const initialAudioStatus: AudioEngineStatus = {
  mode: "sampleHybrid",
  status: "sample-hybrid-loading",
  profileId: defaultSettings.profileId,
  label: "Checking Engine Sound",
  message: "Checking engine sound files.",
  presentAssets: [],
  missingAssets: [],
  missingRequiredAssets: [],
  missingOptionalAssets: [],
  packReadiness: "not-applicable",
};

function App() {
  const [profiles, setProfiles] = useState(() => getVisibleSoundProfiles(getBuiltInProfiles()));
  const profilesRef = useRef(getBuiltInProfiles());
  const audioEngineRef = useRef(createAudioEngine());
  const settingsRef = useRef<CpupovicSettings>(defaultSettings);
  const signalRef = useRef<EngineSignal>(initialSignal);
  const runtimeRef = useRef<RuntimeState>(initialRuntime);
  const lastTrayStatusKeyRef = useRef("");
  const audioReadyRef = useRef(false);
  const demoModeRef = useRef(false);
  const demoCpuPercentRef = useRef(defaultDemoCpuPercent);
  const dropCooldownTimerRef = useRef<number | null>(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [signal, setSignal] = useState(initialSignal);
  const [runtime, setRuntime] = useState(initialRuntime);
  const [policy, setPolicy] = useState<SoundPolicyDecision>(initialPolicy);
  const [audioStatus, setAudioStatus] = useState<AudioEngineStatus>(initialAudioStatus);
  const [audioReady, setAudioReady] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoCpuPercent, setDemoCpuPercent] = useState(defaultDemoCpuPercent);

  const syncTrayStatus = useCallback(
    (nextSettings: CpupovicSettings, nextRuntime: RuntimeState) => {
      const status = {
        running: nextSettings.enabled && nextRuntime.isRunning,
        muted: nextSettings.muted || nextRuntime.isMuted,
        profileId: nextSettings.profileId,
        cpuThresholdOn: nextSettings.cpuThresholdOn,
        cpuThresholdOff: nextSettings.cpuThresholdOff,
      };
      const statusKey = JSON.stringify(status);

      if (statusKey !== lastTrayStatusKeyRef.current) {
        lastTrayStatusKeyRef.current = statusKey;
        void updateTrayStatus(status);
      }
    },
    [],
  );

  const updateSettings = useCallback((patch: Partial<CpupovicSettings>) => {
    const nextSettings = validateSettings({ ...settingsRef.current, ...patch });
    const nextRuntime = {
      ...runtimeRef.current,
      isRunning: Object.prototype.hasOwnProperty.call(patch, "enabled")
        ? nextSettings.enabled
        : runtimeRef.current.isRunning,
      isMuted: Object.prototype.hasOwnProperty.call(patch, "muted")
        ? nextSettings.muted
        : runtimeRef.current.isMuted,
    };

    settingsRef.current = nextSettings;
    runtimeRef.current = nextRuntime;
    setSettings(nextSettings);
    setRuntime(nextRuntime);
    syncTrayStatus(nextSettings, nextRuntime);
    void saveSettings(nextSettings);

    if (Object.prototype.hasOwnProperty.call(patch, "launchAtStartup")) {
      void syncLaunchAtStartup(nextSettings.launchAtStartup);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "closeToTray")) {
      void syncCloseToTray(nextSettings.closeToTray);
    }
  }, [syncTrayStatus]);

  const getActiveProfile = useCallback(() => {
    return (
      profilesRef.current.find((profile) => profile.id === settingsRef.current.profileId) ??
      getSoundProfile(settingsRef.current.profileId)
    );
  }, []);

  const refreshAudioStatus = useCallback(() => {
    const nextPolicy = evaluateSoundPolicy(
      settingsRef.current,
      runtimeRef.current,
      signalRef.current,
    );
    const profile = getActiveProfile();

    audioEngineRef.current.update(signalRef.current, nextPolicy, settingsRef.current, profile);
    setAudioStatus(audioEngineRef.current.getStatus());
  }, [getActiveProfile]);

  const updateAudioReady = useCallback((ready: boolean) => {
    audioReadyRef.current = ready;
    setAudioReady(ready);
  }, []);

  const ensureAudioReady = useCallback(async () => {
    try {
      await audioEngineRef.current.resume();
      const ready = audioEngineRef.current.isReady();
      updateAudioReady(ready);
      refreshAudioStatus();
      return ready;
    } catch {
      updateAudioReady(false);
      return false;
    }
  }, [refreshAudioStatus, updateAudioReady]);

  const handleStartPause = useCallback(() => {
    const shouldStart = !settingsRef.current.enabled || !audioReadyRef.current;

    if (shouldStart) {
      void ensureAudioReady();
      updateSettings({ enabled: true });
      return;
    }

    updateSettings({ enabled: false });
  }, [ensureAudioReady, updateSettings]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !settingsRef.current.muted;

    if (!nextMuted) {
      void ensureAudioReady();
    }

    updateSettings({ muted: nextMuted });
  }, [ensureAudioReady, updateSettings]);

  const updateDemoCpuPercent = useCallback((value: number) => {
    const cleanValue = Math.min(100, Math.max(0, value));
    demoCpuPercentRef.current = cleanValue;
    setDemoCpuPercent(cleanValue);
  }, []);

  const handleDemoModeChange = useCallback((enabled: boolean) => {
    demoModeRef.current = enabled;
    setDemoMode(enabled);
  }, []);

  const handleDemoPreset = useCallback(
    (value: number) => {
      handleDemoModeChange(true);
      updateDemoCpuPercent(value);
    },
    [handleDemoModeChange, updateDemoCpuPercent],
  );

  const handleDemoDropCooldown = useCallback(() => {
    handleDemoModeChange(true);
    updateDemoCpuPercent(95);

    if (dropCooldownTimerRef.current !== null) {
      window.clearTimeout(dropCooldownTimerRef.current);
    }

    dropCooldownTimerRef.current = window.setTimeout(() => {
      updateDemoCpuPercent(5);
      dropCooldownTimerRef.current = null;
    }, 900);
  }, [handleDemoModeChange, updateDemoCpuPercent]);

  const handleTestSound = useCallback(() => {
    const profile = getActiveProfile();
    void ensureAudioReady()
      .then(() => audioEngineRef.current.playTestSound(settingsRef.current, profile))
      .then(() => {
        updateAudioReady(audioEngineRef.current.isReady());
        setAudioStatus(audioEngineRef.current.getStatus());
      });
  }, [ensureAudioReady, getActiveProfile, updateAudioReady]);

  const handleTrayAction = useCallback(
    (action: TrayAction) => {
      if (action.action === "start") {
        void ensureAudioReady();
        updateSettings({ enabled: true });
      }

      if (action.action === "pause") {
        updateSettings({ enabled: false });
      }

      if (action.action === "toggle-mute") {
        const nextMuted = !settingsRef.current.muted;

        if (!nextMuted) {
          void ensureAudioReady();
        }

        updateSettings({ muted: nextMuted });
      }

      if (action.action === "select-profile") {
        updateSettings({ profileId: action.value });
      }

      if (action.action === "set-threshold") {
        const threshold = Number(action.value);

        if (Number.isFinite(threshold)) {
          updateSettings({
            cpuThresholdOn: threshold,
            cpuThresholdOff: getAutomaticThresholdOff(threshold),
          });
        }
      }
    },
    [ensureAudioReady, updateSettings],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateProfiles() {
      const loadedProfiles = await loadSoundProfiles();

      if (cancelled) {
        return;
      }

      profilesRef.current = loadedProfiles;
      setProfiles(getVisibleSoundProfiles(loadedProfiles));
    }

    async function hydrateSettings() {
      const storedSettings = await loadSettings();
      const autostart = await readLaunchAtStartup();
      const nextSettings = validateSettings({
        ...storedSettings,
        enabled: true,
        launchAtStartup: autostart.supported ? autostart.enabled : storedSettings.launchAtStartup,
      });

      if (cancelled) {
        return;
      }

      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      void syncCloseToTray(nextSettings.closeToTray);
      runtimeRef.current = {
        ...runtimeRef.current,
        isRunning: nextSettings.enabled,
        isMuted: nextSettings.muted,
      };
      syncTrayStatus(nextSettings, runtimeRef.current);
      setRuntime(runtimeRef.current);

      if (nextSettings.enabled && !nextSettings.muted) {
        void ensureAudioReady();
      }
    }

    void hydrateProfiles();
    void hydrateSettings();

    return () => {
      cancelled = true;
    };
  }, [ensureAudioReady, syncTrayStatus]);

  useEffect(() => {
    function unlockOnUserGesture() {
      if (settingsRef.current.enabled && !settingsRef.current.muted && !audioReadyRef.current) {
        void ensureAudioReady();
      }
    }

    window.addEventListener("pointerdown", unlockOnUserGesture, { passive: true });
    window.addEventListener("keydown", unlockOnUserGesture);

    return () => {
      window.removeEventListener("pointerdown", unlockOnUserGesture);
      window.removeEventListener("keydown", unlockOnUserGesture);
    };
  }, [ensureAudioReady]);

  useEffect(() => {
    let stopped = false;

    async function tick() {
      const sample = demoModeRef.current
        ? {
            timestampMs: Date.now(),
            cpuLoadPercent: demoCpuPercentRef.current,
          }
        : await getSensorSample();

      if (stopped) {
        return;
      }

      const nextSignal = computeEngineSignal(sample, signalRef.current, settingsRef.current);
      const nextPolicy = evaluateSoundPolicy(settingsRef.current, runtimeRef.current, nextSignal);
      const nextRuntime = runtimeStateFromSignal(
        settingsRef.current,
        runtimeRef.current,
        nextSignal,
        nextPolicy,
      );
      const profile = getActiveProfile();

      signalRef.current = nextSignal;
      runtimeRef.current = nextRuntime;
      setSignal(nextSignal);
      setPolicy(nextPolicy);
      setRuntime(nextRuntime);
      syncTrayStatus(settingsRef.current, nextRuntime);
      audioEngineRef.current.update(nextSignal, nextPolicy, settingsRef.current, profile);
      setAudioStatus(audioEngineRef.current.getStatus());
    }

    void tick();
    const intervalId = window.setInterval(() => void tick(), 500);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [getActiveProfile, syncTrayStatus]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function bindTrayActions() {
      unlisten = await listenToTrayActions(handleTrayAction);
    }

    void bindTrayActions();

    return () => {
      unlisten?.();
    };
  }, [handleTrayAction]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function bindCloseToTray() {
      if (!("__TAURI_INTERNALS__" in window)) {
        return;
      }

      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const currentWindow = getCurrentWindow();
      unlisten = await currentWindow.onCloseRequested((event) => {
        if (settingsRef.current.closeToTray) {
          event.preventDefault();
          void currentWindow.hide();
        }
      });
    }

    void bindCloseToTray();

    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (dropCooldownTimerRef.current !== null) {
        window.clearTimeout(dropCooldownTimerRef.current);
      }

      audioEngineRef.current.dispose();
    };
  }, []);

  return (
    <Dashboard
      policy={policy}
      profiles={profiles}
      audioStatus={audioStatus}
      demoCpuPercent={demoCpuPercent}
      demoMode={demoMode}
      runtime={runtime}
      audioReady={audioReady}
      settings={settings}
      signal={signal}
      onDemoCpuChange={updateDemoCpuPercent}
      onDemoDropCooldown={handleDemoDropCooldown}
      onDemoModeChange={handleDemoModeChange}
      onDemoPreset={handleDemoPreset}
      onStartPause={handleStartPause}
      onTestSound={handleTestSound}
      onToggleMute={handleToggleMute}
      onUpdateSettings={updateSettings}
    />
  );
}

export default App;
