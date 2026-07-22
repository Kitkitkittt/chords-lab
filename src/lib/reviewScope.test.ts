import { describe, expect, it } from "vitest";
import { defaultProgressState } from "./progressStorage";
import { dueSkillsForTrack, isPromptInTrack } from "./reviewScope";

describe("review scope", () => {
  it("scopes prompts by canonical skill targets instead of module identity", () => {
    const staffSkillInHarmonyModule = {
      moduleId: "harmony",
      skillTargets: ["staff-click", "bass"]
    };

    expect(isPromptInTrack(staffSkillInHarmonyModule, "reading-pitch")).toBe(true);
    expect(isPromptInTrack(staffSkillInHarmonyModule, "harmony-songwriting")).toBe(false);
    expect(
      isPromptInTrack({ skillTargets: ["unmapped-secondary-tag"] }, "reading-pitch")
    ).toBe(false);
    expect(isPromptInTrack(staffSkillInHarmonyModule, undefined)).toBe(true);
  });

  it("maps raw due tokens to canonical track skills and exposes other due work", () => {
    const progress = {
      ...defaultProgressState,
      skillMastery: {
        "staff-click": { correct: 1, attempted: 2, ease: 2.3, intervalDays: 1, lapses: 0, dueAt: "2020-01-01T00:00:00.000Z", reviewQueue: [] },
        "chord-symbol": { correct: 1, attempted: 2, ease: 2.3, intervalDays: 1, lapses: 0, dueAt: "2020-01-01T00:00:00.000Z", reviewQueue: [] },
        bass: { correct: 1, attempted: 2, ease: 2.3, intervalDays: 1, lapses: 0, dueAt: "2020-01-01T00:00:00.000Z", reviewQueue: [] }
      }
    };

    expect(dueSkillsForTrack(progress, "reading-pitch", new Date("2026-01-01"))).toEqual({
      included: ["staff-position"],
      elsewhere: ["chord-spelling"]
    });
  });
});
