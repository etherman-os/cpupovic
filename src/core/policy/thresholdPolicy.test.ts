import { describe, expect, it } from "vitest";

import { getAutomaticThresholdOff, shouldContinuousSoundStayActive } from "./thresholdPolicy";

describe("shouldContinuousSoundStayActive", () => {
  it("starts at thresholdOn when currently inactive", () => {
    expect(shouldContinuousSoundStayActive(50, false, 50, 45)).toBe(true);
  });

  it("does not start below thresholdOn", () => {
    expect(shouldContinuousSoundStayActive(49.9, false, 50, 45)).toBe(false);
  });

  it("stays active above thresholdOff", () => {
    expect(shouldContinuousSoundStayActive(45.1, true, 50, 45)).toBe(true);
  });

  it("stops at thresholdOff", () => {
    expect(shouldContinuousSoundStayActive(45, true, 50, 45)).toBe(false);
  });

  it("derives the stop threshold five points below the start threshold", () => {
    expect(getAutomaticThresholdOff(15)).toBe(10);
    expect(getAutomaticThresholdOff(4)).toBe(0);
    expect(getAutomaticThresholdOff(120)).toBe(95);
  });
});
