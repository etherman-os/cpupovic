import { describe, expect, it } from "vitest";

import { getFriendlyPolicyMessage } from "./policyMessages";

describe("getFriendlyPolicyMessage", () => {
  it("maps internal policy reasons to user-facing messages", () => {
    expect(getFriendlyPolicyMessage("below_threshold")).toBe(
      "Waiting: CPU is below your start level",
    );
    expect(getFriendlyPolicyMessage("above_threshold")).toBe("Engine sound is running");
    expect(getFriendlyPolicyMessage("muted")).toBe("Muted");
    expect(getFriendlyPolicyMessage("disabled")).toBe("Paused");
    expect(getFriendlyPolicyMessage("battery_saver")).toBe("Paused for battery saver");
    expect(getFriendlyPolicyMessage("redline")).toBe("High CPU: full throttle");
    expect(getFriendlyPolicyMessage("spike")).toBe("CPU spike: rev burst");
  });
});
