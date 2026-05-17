import { getAutomaticThresholdOff } from "../../core/policy/thresholdPolicy";

type ThresholdSettingsProps = {
  thresholdOn: number;
  thresholdOff: number;
  onChange: (thresholds: { cpuThresholdOn: number; cpuThresholdOff: number }) => void;
};

export function ThresholdSettings({
  thresholdOn,
  thresholdOff,
  onChange,
}: ThresholdSettingsProps) {
  const updateThreshold = (cpuThresholdOn: number) => {
    onChange({
      cpuThresholdOn,
      cpuThresholdOff: getAutomaticThresholdOff(cpuThresholdOn),
    });
  };

  return (
    <div className="threshold-control">
      <label className="field">
        <span>Start sound above CPU</span>
        <div className="range-row">
          <input
            aria-label="Start sound above CPU"
            max={100}
            min={0}
            step={1}
            type="range"
            value={thresholdOn}
            onChange={(event) => updateThreshold(Number(event.currentTarget.value))}
          />
          <strong>{Math.round(thresholdOn)}%</strong>
        </div>
      </label>
      <small>Stops below {Math.round(thresholdOff)}% to prevent flicker.</small>
    </div>
  );
}
