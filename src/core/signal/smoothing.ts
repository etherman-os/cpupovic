export function smoothValue(
  previous: number,
  target: number,
  deltaMs: number,
  smoothingMs: number,
): number {
  if (deltaMs <= 0 || smoothingMs <= 0) {
    return target;
  }

  const alpha = 1 - Math.exp(-deltaMs / smoothingMs);
  return previous + (target - previous) * alpha;
}
