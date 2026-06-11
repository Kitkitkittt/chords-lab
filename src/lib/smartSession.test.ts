/**
 * Tests for the Smart Session planner. Pure unit tests: build progress by
 * spreading `defaultProgressState` and overriding `skillMastery`.
 */

import { describe, expect, it } from "vitest";
import type { ProgressState, SkillMastery } from "../types/course";
import { defaultProgressState } from "./progressStorage";
import { describePlan, planSmartSession } from "./smartSession";

function mastery(overrides: Partial<SkillMastery>): SkillMastery {
  return {
    correct: 0,
    attempted: 0,
    ease: 2.3,
    intervalDays: 1,
    lapses: 0,
    reviewQueue: [],
    ...overrides
  };
}

function withMastery(
  skillMastery: ProgressState["skillMastery"]
): ProgressState {
  return { ...defaultProgressState, skillMastery };
}

describe("planSmartSession", () => {
  it("returns only new slots for empty progress", () => {
    const plan = planSmartSession(defaultProgressState);
    const skillIds = plan.slots.map((slot) => slot.skillId);

    expect(plan.slots.length).toBeGreaterThan(0);
    expect(plan.slots.length).toBeLessThanOrEqual(10);
    expect(plan.slots.every((slot) => slot.reason === "new")).toBe(true);
    expect(new Set(skillIds).size).toBe(skillIds.length);
    expect(plan.slots.every((slot) => slot.moduleId.length > 0)).toBe(true);
  });

  it("includes a past-due skill with reason 'due'", () => {
    const plan = planSmartSession(
      withMastery({
        "scale-spelling": mastery({
          correct: 4,
          attempted: 6,
          dueAt: "2020-01-01T00:00:00.000Z",
          lastPracticedAt: "2019-12-25T00:00:00.000Z"
        })
      })
    );

    const due = plan.slots.find((slot) => slot.skillId === "scale-spelling");

    expect(due).toBeDefined();
    expect(due?.reason).toBe("due");
  });

  it("includes a low-accuracy skill with reason 'weak'", () => {
    const plan = planSmartSession(
      withMastery({
        "interval-quality": mastery({ correct: 1, attempted: 10 })
      })
    );

    const weak = plan.slots.find((slot) => slot.skillId === "interval-quality");

    expect(weak).toBeDefined();
    expect(weak?.reason).toBe("weak");
  });

  it("never exceeds the requested size", () => {
    const plan = planSmartSession(defaultProgressState, 3);

    expect(plan.slots.length).toBeLessThanOrEqual(3);
  });

  it("never duplicates a skill id", () => {
    const plan = planSmartSession(
      withMastery({
        "scale-spelling": mastery({
          correct: 1,
          attempted: 10,
          dueAt: "2020-01-01T00:00:00.000Z"
        }),
        "interval-quality": mastery({ correct: 1, attempted: 8 })
      })
    );

    const skillIds = plan.slots.map((slot) => slot.skillId);

    expect(new Set(skillIds).size).toBe(skillIds.length);
  });
});

describe("describePlan", () => {
  it("reports the total count and labels review/new appropriately", () => {
    const newPlan = planSmartSession(defaultProgressState);
    const newSummary = describePlan(newPlan);

    expect(newSummary).toContain(String(newPlan.slots.length));
    expect(newSummary).toContain("new");

    const duePlan = planSmartSession(
      withMastery({
        "scale-spelling": mastery({
          correct: 4,
          attempted: 6,
          dueAt: "2020-01-01T00:00:00.000Z"
        })
      })
    );

    expect(describePlan(duePlan)).toContain("review");
  });
});
