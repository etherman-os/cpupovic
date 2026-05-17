export type SensorSample = {
  timestampMs: number;
  cpuLoadPercent: number;
  temperatureCelsius?: number;
  fanRpm?: number;
};

export type EngineState =
  | "off"
  | "silent"
  | "idle"
  | "cruising"
  | "revving"
  | "redline"
  | "cooling";

export type EngineSignal = {
  timestampMs: number;
  rawCpuPercent: number;
  smoothedCpuPercent: number;
  throttle: number;
  virtualRpm: number;
  heat: number;
  spike: boolean;
  falling: boolean;
  engineState: EngineState;
};
