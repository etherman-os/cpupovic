import { describe, expect, it } from "vitest";

import { detectCpuFall, detectCpuSpike } from "./spikeDetector";

describe("spike detection", () => {
  it("detects a large absolute CPU jump", () => {
    expect(detectCpuSpike(20, 36, 1000)).toBe(true);
  });

  it("detects a fast CPU jump", () => {
    expect(detectCpuSpike(20, 28, 200)).toBe(true);
  });

  it("ignores small slow CPU increases", () => {
    expect(detectCpuSpike(20, 23, 1000)).toBe(false);
  });

  it("detects fast falling CPU", () => {
    expect(detectCpuFall(80, 66, 1000)).toBe(true);
    expect(detectCpuFall(80, 76, 100)).toBe(true);
  });

  it("ignores small slow CPU drops", () => {
    expect(detectCpuFall(80, 78, 1000)).toBe(false);
  });
});
