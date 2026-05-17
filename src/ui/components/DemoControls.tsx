import { Activity, ArrowDown, Gauge, Volume2, Zap } from "lucide-react";

type DemoControlsProps = {
  demoMode: boolean;
  demoCpuPercent: number;
  muted: boolean;
  onDemoModeChange: (enabled: boolean) => void;
  onDemoCpuChange: (value: number) => void;
  onPreset: (value: number) => void;
  onDropCooldown: () => void;
  onTestSound: () => void;
};

export function DemoControls({
  demoMode,
  demoCpuPercent,
  muted,
  onDemoModeChange,
  onDemoCpuChange,
  onPreset,
  onDropCooldown,
  onTestSound,
}: DemoControlsProps) {
  return (
    <div className="demo-controls">
      <label className="toggle-row">
        <input
          checked={demoMode}
          type="checkbox"
          onChange={(event) => onDemoModeChange(event.currentTarget.checked)}
        />
        <span>Demo/Test Mode</span>
      </label>

      <label className="field">
        <span>Test CPU</span>
        <div className="range-row">
          <input
            aria-label="Demo CPU"
            disabled={!demoMode}
            max={100}
            min={0}
            step={1}
            type="range"
            value={demoCpuPercent}
            onChange={(event) => onDemoCpuChange(Number(event.currentTarget.value))}
          />
          <strong>{Math.round(demoCpuPercent)}%</strong>
        </div>
      </label>

      <div className="button-row button-row-wrap">
        <button className="button button-compact" type="button" onClick={() => onPreset(5)}>
          <Gauge aria-hidden="true" size={16} />
          <span>Idle</span>
        </button>
        <button className="button button-compact" type="button" onClick={() => onPreset(35)}>
          <Activity aria-hidden="true" size={16} />
          <span>Cruise</span>
        </button>
        <button className="button button-compact" type="button" onClick={() => onPreset(70)}>
          <Zap aria-hidden="true" size={16} />
          <span>Rev</span>
        </button>
        <button className="button button-compact" type="button" onClick={() => onPreset(95)}>
          <Zap aria-hidden="true" size={16} />
          <span>Redline</span>
        </button>
        <button className="button button-compact" type="button" onClick={onDropCooldown}>
          <ArrowDown aria-hidden="true" size={16} />
          <span>Drop/Cooldown</span>
        </button>
      </div>

      <button
        className="button button-primary test-sound-button"
        title={muted ? "Muted: Test Rev will not play" : "Play a short engine rev"}
        type="button"
        onClick={onTestSound}
      >
        <Volume2 aria-hidden="true" size={18} />
        <span>Test Rev</span>
      </button>
    </div>
  );
}
