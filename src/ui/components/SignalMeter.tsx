import type { CSSProperties } from "react";

type SignalMeterProps = {
  label: string;
  value: number;
  unit?: string;
  tone?: "red" | "amber" | "green";
};

export function SignalMeter({ label, value, unit = "%", tone = "green" }: SignalMeterProps) {
  const rounded = Math.round(value);
  const style = { "--meter-width": `${Math.min(100, Math.max(0, value))}%` } as CSSProperties &
    Record<"--meter-width", string>;

  return (
    <div className="metric">
      <div className="metric-topline">
        <span>{label}</span>
        <strong>
          {rounded}
          {unit}
        </strong>
      </div>
      <div className={`meter meter-${tone}`} style={style} aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
