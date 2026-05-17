export function shouldContinuousSoundStayActive(
  smoothedCpuPercent: number,
  wasActive: boolean,
  thresholdOn: number,
  thresholdOff: number,
): boolean {
  return wasActive ? smoothedCpuPercent > thresholdOff : smoothedCpuPercent >= thresholdOn;
}

export function getAutomaticThresholdOff(thresholdOn: number): number {
  return Math.max(0, Math.min(100, thresholdOn) - 5);
}
