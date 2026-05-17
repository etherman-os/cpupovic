export function detectCpuSpike(previousCpu: number, currentCpu: number, deltaMs: number): boolean {
  const delta = currentCpu - previousCpu;
  const ratePerSecond = deltaMs > 0 ? (delta / deltaMs) * 1000 : delta;
  return delta >= 14 || ratePerSecond >= 28;
}

export function detectCpuFall(previousCpu: number, currentCpu: number, deltaMs: number): boolean {
  const delta = previousCpu - currentCpu;
  const ratePerSecond = deltaMs > 0 ? (delta / deltaMs) * 1000 : delta;
  return delta >= 12 || ratePerSecond >= 24;
}
