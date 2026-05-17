export function mapCpuToVirtualRpm(
  cpuNormalized: number,
  idleRpm: number,
  maxRpm: number,
  curve: number,
): number {
  const clampedCpu = clamp(cpuNormalized, 0, 1);
  const curved = Math.pow(clampedCpu, curve);
  return idleRpm + curved * (maxRpm - idleRpm);
}

export function rpmToNormalized(rpm: number, idleRpm: number, maxRpm: number): number {
  if (maxRpm <= idleRpm) {
    return 0;
  }

  return clamp((rpm - idleRpm) / (maxRpm - idleRpm), 0, 1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
