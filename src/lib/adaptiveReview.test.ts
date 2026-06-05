import { describe, expect, it } from "vitest";
import {
  getDueSkillIds,
  updateAdaptiveSkillState
} from "./adaptiveReview";

describe("adaptive review", () => {
  it("moves incorrect skills into immediate review and schedules correct skills later", () => {
    const now = new Date("2026-05-31T00:00:00.000Z");
    const missed = updateAdaptiveSkillState(
      undefined,
      "staff-click-1",
      false,
      now
    );
    const recovered = updateAdaptiveSkillState(
      missed,
      "staff-click-1",
      true,
      now
    );

    expect(missed.reviewQueue).toEqual(["staff-click-1"]);
    expect(missed.dueAt).toBe("2026-05-31T00:00:00.000Z");
    expect(recovered.reviewQueue).toEqual([]);
    expect(Date.parse(recovered.dueAt ?? "")).toBeGreaterThan(now.getTime());
  });

  it("orders due skills before future skills", () => {
    expect(
      getDueSkillIds(
        {
          due: {
            correct: 0,
            attempted: 1,
            ease: 2,
            intervalDays: 0,
            dueAt: "2026-05-30T00:00:00.000Z",
            lapses: 1,
            lastResult: "incorrect",
            reviewQueue: ["prompt-1"]
          },
          future: {
            correct: 1,
            attempted: 1,
            ease: 2.3,
            intervalDays: 2,
            dueAt: "2026-06-02T00:00:00.000Z",
            lapses: 0,
            lastResult: "correct",
            reviewQueue: []
          }
        },
        new Date("2026-05-31T00:00:00.000Z")
      )
    ).toEqual(["due"]);
  });
});
