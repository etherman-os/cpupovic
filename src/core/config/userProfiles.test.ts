import { describe, expect, it } from "vitest";

import { builtInProfileList } from "./builtInProfiles";
import { getUserVisibleProfiles, sanitizeUserProfileId } from "./userProfiles";

describe("userProfiles", () => {
  it("shows Local Engine Pack and Supara Pack to normal users", () => {
    expect(getUserVisibleProfiles(builtInProfileList).map((profile) => profile.id)).toEqual([
      "local-engine",
      "supara",
    ]);
  });

  it("migrates hidden profile ids to local-engine", () => {
    expect(sanitizeUserProfileId("tiny-scooter")).toBe("local-engine");
    expect(sanitizeUserProfileId("sport-exhaust")).toBe("local-engine");
    expect(sanitizeUserProfileId("safe-demo-engine")).toBe("local-engine");
    expect(sanitizeUserProfileId("local-engine")).toBe("local-engine");
    expect(sanitizeUserProfileId("supara")).toBe("supara");
    expect(sanitizeUserProfileId("garage-engine")).toBe("garage-engine");
    expect(sanitizeUserProfileId("../garage-engine")).toBe("local-engine");
  });
});
