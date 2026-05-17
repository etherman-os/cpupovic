import { Gauge, RadioTower, Volume2 } from "lucide-react";

import {
  getFriendlyEngineSoundTitle,
  getFriendlySoundFilesStatus,
  getLoadedSoundFileNames,
  getMissingSoundFileNames,
} from "../../core/audio/audioStatusDisplay";
import type { AudioEngineStatus } from "../../core/audio/audioTypes";
import type { SoundProfile } from "../../core/config/profileTypes";
import { getFriendlyPolicyMessage } from "../../core/policy/policyMessages";
import type { SoundPolicyDecision } from "../../core/policy/soundPolicy";
import type { EngineSignal, EngineState } from "../../core/signal/signalTypes";
import type { CpupovicSettings } from "../../core/settings/settingsTypes";
import type { RuntimeState } from "../../core/tray/trayState";
import { DemoControls } from "./DemoControls";
import { EffectsSettings } from "./EffectsSettings";
import { MuteButton } from "./MuteButton";
import { RpmGauge } from "./RpmGauge";
import { StartupSettings } from "./StartupSettings";
import { StartPauseButton } from "./StartPauseButton";
import { ThresholdSettings } from "./ThresholdSettings";
import { VolumeSlider } from "./VolumeSlider";

type DashboardProps = {
  settings: CpupovicSettings;
  runtime: RuntimeState;
  signal: EngineSignal;
  policy: SoundPolicyDecision;
  profiles: SoundProfile[];
  audioStatus: AudioEngineStatus;
  audioReady: boolean;
  demoMode: boolean;
  demoCpuPercent: number;
  onDemoModeChange: (enabled: boolean) => void;
  onDemoCpuChange: (value: number) => void;
  onDemoPreset: (value: number) => void;
  onDemoDropCooldown: () => void;
  onTestSound: () => void;
  onStartPause: () => void;
  onToggleMute: () => void;
  onUpdateSettings: (settings: Partial<CpupovicSettings>) => void;
};

export function Dashboard({
  settings,
  runtime,
  signal,
  policy,
  profiles,
  audioStatus,
  audioReady,
  demoMode,
  demoCpuPercent,
  onDemoModeChange,
  onDemoCpuChange,
  onDemoPreset,
  onDemoDropCooldown,
  onTestSound,
  onStartPause,
  onToggleMute,
  onUpdateSettings,
}: DashboardProps) {
  const selectedProfile =
    profiles.find((profile) => profile.id === settings.profileId) ??
    profiles.find((profile) => profile.id === "local-engine");
  const loadedFiles = getLoadedSoundFileNames(audioStatus, selectedProfile);
  const missingFiles = getMissingSoundFileNames(audioStatus, selectedProfile);
  const friendlyStatus = getFriendlyPolicyMessage(policy.reason);
  const engineSoundTitle = getFriendlyEngineSoundTitle(audioStatus);
  const soundPackName = selectedProfile?.name ?? engineSoundTitle;
  const soundPackPath = `public/soundpacks/${selectedProfile?.id ?? "local-engine"}/`;
  const soundFilesStatus = getFriendlySoundFilesStatus(audioStatus);
  const optionalEffectsStatus =
    audioStatus.status === "sample-hybrid-active" && audioStatus.missingRequiredAssets.length === 0
      ? audioStatus.missingOptionalAssets.length === 0
        ? "Optional effects loaded"
        : "Some optional effects missing"
      : "";
  const engineSoundOn = runtime.soundActive && audioReady;
  const statusDetail =
    settings.enabled && !settings.muted && !audioReady
      ? "Click Start or Test Rev to enable sound"
      : friendlyStatus;

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div>
          <p className="eyebrow">tray-first desktop sound toy</p>
          <h1 className="brand-title">
            <span>CPUpoviç</span>
            <small>by etherman-os</small>
          </h1>
          <p className="tagline">Your CPU was already suffering. Now it suffers with style.</p>
        </div>
        <div className="hero-actions">
          <StartPauseButton running={runtime.isRunning && audioReady} onClick={onStartPause} />
          <MuteButton muted={runtime.isMuted} onClick={onToggleMute} />
          <div className="hero-volume">
            <VolumeSlider volume={settings.volume} onChange={(volume) => onUpdateSettings({ volume })} />
          </div>
        </div>
      </section>

      <section className="runtime-readouts" aria-label="Engine readout">
        <ReadoutCard
          detail="Current CPU"
          label="Current CPU"
          tone={getPercentTone(runtime.currentCpuPercent)}
          value={`${Math.round(runtime.currentCpuPercent)}%`}
        />
        <ReadoutCard
          detail={`${Math.round(runtime.virtualRpm).toLocaleString()} RPM`}
          label="Engine Level"
          tone={getPercentTone(signal.throttle * 100)}
          value={`${Math.round(signal.throttle * 100)}%`}
        />
        <ReadoutCard
          detail={statusDetail}
          label="Status"
          tone={engineSoundOn ? "green" : policy.reason === "muted" ? "amber" : "neutral"}
          value={formatEngineState(runtime.engineState)}
        />
        <ReadoutCard
          detail={soundFilesStatus}
          label="Engine Sound"
          tone={audioStatus.status === "sample-hybrid-active" ? "green" : "amber"}
          value={engineSoundOn ? "On" : "Off"}
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel panel-gauge">
          <div className="panel-heading">
            <Gauge aria-hidden="true" size={18} />
            <h2>Engine Level</h2>
          </div>
          <RpmGauge rpm={runtime.virtualRpm} idleRpm={settings.idleRpm} maxRpm={settings.maxRpm} />
          <div className="gauge-caption">{Math.round(runtime.virtualRpm).toLocaleString()} RPM</div>
        </div>

        <div className="panel panel-sound">
          <div className="panel-heading">
            <Volume2 aria-hidden="true" size={18} />
            <h2>Engine Sound</h2>
          </div>
          <div className={`audio-status audio-status-${audioStatus.status}`}>
            <label className="profile-select">
              <span>Sound Pack</span>
              <select
                aria-label="Sound Pack"
                value={selectedProfile?.id ?? "local-engine"}
                onChange={(event) => onUpdateSettings({ profileId: event.currentTarget.value })}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <strong>{soundPackName}</strong>
            <span>{soundFilesStatus}</span>
            {optionalEffectsStatus ? <small>{optionalEffectsStatus}</small> : null}
            {loadedFiles.length > 0 ? <small>Loaded: {loadedFiles.join(", ")}</small> : null}
            {missingFiles.length > 0 ? <small>Missing: {missingFiles.join(", ")}</small> : null}
            {audioStatus.status === "missing-sample-assets" ? (
              <small className="audio-warning">
                Add the missing files to `{soundPackPath}`.
              </small>
            ) : null}
          </div>
          <button
            className="button button-primary test-sound-button"
            title={settings.muted ? "Muted: Test Rev will not play" : "Play a short engine rev"}
            type="button"
            onClick={onTestSound}
          >
            <RadioTower aria-hidden="true" size={18} />
            <span>Test Rev</span>
          </button>
        </div>

        <div className="panel">
          <h2>CPU Start Level</h2>
          <ThresholdSettings
            thresholdOff={settings.cpuThresholdOff}
            thresholdOn={settings.cpuThresholdOn}
            onChange={onUpdateSettings}
          />
        </div>

        <div className="panel">
          <h2>Effects</h2>
          <EffectsSettings
            cooldownPsshEnabled={settings.cooldownPsshEnabled}
            redlineEnabled={settings.redlineEnabled}
            revBurstEnabled={settings.revBurstEnabled}
            onChange={onUpdateSettings}
          />
        </div>

        <div className="panel">
          <h2>Startup and tray</h2>
          <StartupSettings
            batterySaverMode={settings.batterySaverMode}
            closeToTray={settings.closeToTray}
            launchAtStartup={settings.launchAtStartup}
            startMinimizedToTray={settings.startMinimizedToTray}
            onChange={onUpdateSettings}
          />
        </div>

        <details className="panel panel-demo">
          <summary>Test Tools</summary>
          <p className="panel-help">Use this only to test the engine sound without loading your CPU.</p>
          <DemoControls
            demoCpuPercent={demoCpuPercent}
            demoMode={demoMode}
            muted={settings.muted}
            onDemoCpuChange={onDemoCpuChange}
            onDemoModeChange={onDemoModeChange}
            onDropCooldown={onDemoDropCooldown}
            onPreset={onDemoPreset}
            onTestSound={onTestSound}
          />
        </details>
      </section>
    </main>
  );
}

function ReadoutCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "neutral" | "green" | "amber" | "red";
  value: string;
}) {
  return (
    <div className={`readout-card readout-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function getPercentTone(percent: number): "green" | "amber" | "red" {
  if (percent >= 85) {
    return "red";
  }

  if (percent >= 50) {
    return "amber";
  }

  return "green";
}

function formatEngineState(state: EngineState): string {
  switch (state) {
    case "off":
      return "Paused";
    case "silent":
      return "Waiting";
    case "idle":
      return "Idle";
    case "cruising":
      return "Running";
    case "revving":
      return "Revving";
    case "redline":
      return "Full throttle";
    case "cooling":
      return "Cooling";
  }
}
