type VolumeSliderProps = {
  volume: number;
  onChange: (volume: number) => void;
};

export function VolumeSlider({ volume, onChange }: VolumeSliderProps) {
  return (
    <label className="field">
      <span>Volume</span>
      <div className="range-row">
        <input
          aria-label="Volume"
          max={1}
          min={0}
          step={0.01}
          type="range"
          value={volume}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
        <strong>{Math.round(volume * 100)}%</strong>
      </div>
    </label>
  );
}
