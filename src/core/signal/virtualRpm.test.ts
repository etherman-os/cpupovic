import { describe, expect, it } from "vitest";

import { mapCpuToVirtualRpm, rpmToNormalized } from "./virtualRpm";

describe("virtual RPM mapping", () => {
  it("maps zero CPU to idle RPM", () => {
    expect(mapCpuToVirtualRpm(0, 850, 8200, 1.6)).toBe(850);
  });

  it("maps full CPU to max RPM", () => {
    expect(mapCpuToVirtualRpm(1, 850, 8200, 1.6)).toBe(8200);
  });

  it("clamps input outside the normalized CPU range", () => {
    expect(mapCpuToVirtualRpm(-1, 850, 8200, 1.6)).toBe(850);
    expect(mapCpuToVirtualRpm(2, 850, 8200, 1.6)).toBe(8200);
  });

  it("uses the configured curve", () => {
    const linear = mapCpuToVirtualRpm(0.5, 800, 8000, 1);
    const curved = mapCpuToVirtualRpm(0.5, 800, 8000, 2);

    expect(curved).toBeLessThan(linear);
  });

  it("normalizes RPM back into a 0-1 range", () => {
    expect(rpmToNormalized(850, 850, 8200)).toBe(0);
    expect(rpmToNormalized(8200, 850, 8200)).toBe(1);
    expect(rpmToNormalized(9000, 850, 8200)).toBe(1);
  });
});
