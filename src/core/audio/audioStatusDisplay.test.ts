import { describe, expect, it } from "vitest";

import type { AudioEngineStatus } from "./audioTypes";
import {
  getFriendlyEngineSoundTitle,
  getFriendlySoundFilesStatus,
  getMissingSoundFileNames,
} from "./audioStatusDisplay";
import { builtInProfiles } from "../config/builtInProfiles";

const localProfile = builtInProfiles["local-engine"];

describe("audioStatusDisplay", () => {
  it("shows local pack readiness in normal user language", () => {
    const status: AudioEngineStatus = {
      mode: "sampleHybrid",
      status: "sample-hybrid-active",
      profileId: "local-engine",
      label: "Local Engine Pack Loaded",
      message: "Local Engine Pack is ready.",
      presentAssets: ["idle", "low", "mid", "high", "revBurst", "cooldown"],
      missingAssets: [],
      missingRequiredAssets: [],
      missingOptionalAssets: [],
      packReadiness: "ready",
    };

    expect(getFriendlyEngineSoundTitle(status)).toBe("Local Engine Pack");
    expect(getFriendlySoundFilesStatus(status)).toBe("Sound files loaded");
  });

  it("shows Supara Pack readiness in normal user language", () => {
    const status: AudioEngineStatus = {
      mode: "sampleHybrid",
      status: "sample-hybrid-active",
      profileId: "supara",
      label: "Supara Pack Loaded",
      message: "Supara Pack is ready.",
      presentAssets: ["idle", "low", "mid", "high", "boostSpool", "turboFlutter"],
      missingAssets: [],
      missingRequiredAssets: [],
      missingOptionalAssets: [],
      packReadiness: "ready",
    };

    expect(getFriendlyEngineSoundTitle(status)).toBe("Supara Pack");
    expect(getFriendlySoundFilesStatus(status)).toBe("Sound files loaded");
  });

  it("reports optional effect files without failing the pack", () => {
    const status: AudioEngineStatus = {
      mode: "sampleHybrid",
      status: "sample-hybrid-active",
      profileId: "supara",
      label: "Supara Pack Loaded",
      message: "Core sound files are loaded. Optional rev sounds are missing.",
      presentAssets: ["idle", "low", "mid", "high"],
      missingAssets: ["boostSpool", "turboFlutter"],
      missingRequiredAssets: [],
      missingOptionalAssets: ["boostSpool", "turboFlutter"],
      packReadiness: "missing-optional-one-shots",
    };

    expect(getFriendlyEngineSoundTitle(status)).toBe("Supara Pack");
    expect(getFriendlySoundFilesStatus(status)).toBe("Core sound files loaded");
  });

  it("maps missing local pack assets to filenames", () => {
    const status: AudioEngineStatus = {
      mode: "sampleHybrid",
      status: "missing-sample-assets",
      profileId: "local-engine",
      label: "Engine Sound Files Missing",
      message: "Some engine sound files are missing.",
      presentAssets: ["idle"],
      missingAssets: ["low", "mid", "high"],
      missingRequiredAssets: ["low", "mid", "high"],
      missingOptionalAssets: [],
      packReadiness: "missing-required-loops",
    };

    expect(getFriendlyEngineSoundTitle(status)).toBe("Engine sound files are missing");
    expect(getFriendlySoundFilesStatus(status)).toBe("Some engine sound files are missing");
    expect(getMissingSoundFileNames(status, localProfile)).toEqual([
      "low.wav",
      "mid.wav",
      "high.wav",
    ]);
  });
});
