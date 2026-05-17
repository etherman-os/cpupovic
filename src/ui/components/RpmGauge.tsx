import type { CSSProperties } from "react";

type RpmGaugeProps = {
  rpm: number;
  idleRpm: number;
  maxRpm: number;
};

export function RpmGauge({ rpm, idleRpm, maxRpm }: RpmGaugeProps) {
  const normalized = Math.min(
    1,
    Math.max(0, maxRpm > idleRpm ? (rpm - idleRpm) / (maxRpm - idleRpm) : 0),
  );
  const angle = Math.min(270, Math.max(0, normalized * 270));
  const style = {
    "--gauge-angle": `${angle}deg`,
    "--gauge-color": getGaugeColor(normalized),
    "--needle-angle": `${-135 + angle}deg`,
  } as CSSProperties &
    Record<"--gauge-angle" | "--gauge-color" | "--needle-angle", string>;

  return (
    <div className="rpm-gauge" style={style}>
      <div className="rpm-gauge-needle" aria-hidden="true" />
      <div className="rpm-gauge-face">
        <span>RPM</span>
        <strong>{Math.round(rpm).toLocaleString()}</strong>
      </div>
    </div>
  );
}

function getGaugeColor(normalized: number): string {
  if (normalized >= 0.85) {
    return "#e63946";
  }

  if (normalized >= 0.5) {
    return "#f4a261";
  }

  return "#2a9d8f";
}
