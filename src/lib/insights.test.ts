/**
 * Tests for the practice insights analyzer.
 *
 * These cover the pure helpers (`accuracy`, `weakestSkill`, `strongestSkill`)
 * and the `buildInsights` card builder against empty and populated progress.
 */

import { describe, expect, it } from "vitest";
import type { ProgressState, SkillMastery } from "../types/course";
import {
  accuracy,
  buildInsights,
  strongestSkill,
  weakestSkill
} from "./insights";
import { defaultProgressState } from "./progressStorage";

function skill(correct: number, attempted: number): SkillMastery {
  return {
    correct,
    attempted,
    ease: 2.3,
    intervalDays: 1,
    lapses: 0,
    reviewQueue: []
  };
}

describe("accuracy", () => {
  it("returns a safe ratio", () => {
    expect(accuracy(3, 4)).toBe(0.75);
  });

  it("returns 0 when nothing was attempted", () => {
    expect(accuracy(0, 0)).toBe(0);
  });
});

describe("weakestSkill and strongestSkill", () => {
  const progress: ProgressState = {
    ...defaultProgressState,
    skillMastery: {
      "note-reading": skill(1, 5),
      "interval-quality": skill(5, 5)
    }
  };

  it("finds the lowest-accuracy qualifying skill", () => {
    expect(weakestSkill(progress)).toBe("note-reading");
  });

  it("finds the highest-accuracy qualifying skill", () => {
    expect(strongestSkill(progress)).toBe("interval-quality");
  });

  it("ignores skills below the attempt threshold", () => {
    const sparse: ProgressState = {
      ...defaultProgressState,
      skillMastery: {
        "note-reading": skill(0, 2)
      }
    };

    expect(weakestSkill(sparse)).toBeUndefined();
    expect(strongestSkill(sparse)).toBeUndefined();
  });
});

describe("buildInsights", () => {
  it("returns the gentle default card for empty progress and never throws", () => {
    const cards = buildInsights(defaultProgressState);

    expect(cards.length).toBeGreaterThan(0);
    expect(cards.some((card) => card.id === "getting-started")).toBe(true);
  });

  it("links to review when a practice review queue has entries", () => {
    const progress: ProgressState = {
      ...defaultProgressState,
      practiceMastery: {
        pitch: {
          correct: 2,
          attempted: 5,
          streak: 0,
          reviewQueue: ["note-reading-1", "note-reading-2"]
        }
      }
    };

    const cards = buildInsights(progress);

    expect(cards.some((card) => card.actionRoute === "/review")).toBe(true);
  });

  it("surfaces a focus card for the weakest skill with a practice route", () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    const progress: ProgressState = {
      ...defaultProgressState,
      skillMastery: {
        "note-reading": skill(1, 5),
        "interval-quality": skill(5, 5)
      }
    };

    const cards = buildInsights(progress, now);
    const weak = cards.find((card) => card.id === "weak-note-reading");

    expect(weak).toBeDefined();
    expect(weak?.tone).toBe("focus");
    expect(weak?.actionRoute).toBe("/practice/pitch");
  });

  it("counts only sessions within the last seven days for momentum", () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    const progress: ProgressState = {
      ...defaultProgressState,
      generatedSessionHistory: [
        {
          id: "recent",
          moduleId: "pitch",
          configSummary: "10 prompts",
          correct: 8,
          attempted: 10,
          missedPromptIds: [],
          completedAt: "2026-06-08T00:00:00.000Z"
        },
        {
          id: "old",
          moduleId: "pitch",
          configSummary: "10 prompts",
          correct: 6,
          attempted: 10,
          missedPromptIds: [],
          completedAt: "2026-05-01T00:00:00.000Z"
        }
      ]
    };

    const cards = buildInsights(progress, now);
    const momentum = cards.find((card) => card.id === "momentum");

    expect(momentum).toBeDefined();
    expect(momentum?.body).toContain("1 session");
  });

  it("adds a qualifying confusion focus card with an encoded route", () => {
    const progress: ProgressState = {
      ...defaultProgressState,
      practiceAttempts: [
        {
          promptId: "pitch-1",
          moduleId: "pitch",
          isCorrect: false,
          expected: ["C"],
          selected: ["D"],
          question: "Which note is shown?",
          skillTargets: ["note-reading"],
          attemptedAt: "2026-06-10T00:00:00.000Z"
        },
        {
          promptId: "pitch-2",
          moduleId: "pitch",
          isCorrect: false,
          expected: ["D"],
          selected: ["C"],
          question: "Which note is shown?",
          skillTargets: ["note-reading"],
          attemptedAt: "2026-06-11T00:00:00.000Z"
        }
      ]
    };

    const card = buildInsights(progress).find((item) => item.id.startsWith("confusion-"));

    expect(card?.title).toBe("A useful contrast: C and D");
    expect(card?.body).toContain("2 times");
    expect(card?.actionLabel).toBe("Practice this contrast");
    expect(card?.actionRoute).toBe(
      "/practice/confusions?pair=confusion-%255B%2522C%2522%252C%2522D%2522%255D"
    );
  });

  it("does not surface a single confusion occurrence", () => {
    const progress: ProgressState = {
      ...defaultProgressState,
      practiceAttempts: [
        {
          promptId: "pitch-1",
          moduleId: "pitch",
          isCorrect: false,
          expected: ["C"],
          selected: ["D"],
          question: "Which note is shown?",
          skillTargets: ["note-reading"],
          attemptedAt: "2026-06-10T00:00:00.000Z"
        }
      ]
    };

    expect(buildInsights(progress).some((card) => card.id.startsWith("confusion-"))).toBe(false);
  });

  it("returns at most five cards", () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    const progress: ProgressState = {
      ...defaultProgressState,
      skillMastery: {
        "note-reading": skill(1, 5),
        "interval-quality": skill(5, 5),
        "scale-spelling": {
          ...skill(2, 6),
          reviewQueue: ["scale-1"]
        }
      },
      practiceMastery: {
        pitch: {
          correct: 2,
          attempted: 5,
          streak: 0,
          reviewQueue: ["note-reading-1"]
        }
      },
      generatedSessionHistory: [
        {
          id: "recent",
          moduleId: "pitch",
          configSummary: "10 prompts",
          correct: 8,
          attempted: 10,
          missedPromptIds: [],
          completedAt: "2026-06-09T00:00:00.000Z"
        }
      ],
      practiceAttempts: [
        {
          promptId: "pitch-1",
          moduleId: "pitch",
          isCorrect: false,
          expected: ["C"],
          selected: ["D"],
          question: "Which note is shown?",
          skillTargets: ["note-reading"],
          attemptedAt: "2026-06-09T00:00:00.000Z"
        },
        {
          promptId: "pitch-2",
          moduleId: "pitch",
          isCorrect: false,
          expected: ["D"],
          selected: ["C"],
          question: "Which note is shown?",
          skillTargets: ["note-reading"],
          attemptedAt: "2026-06-09T01:00:00.000Z"
        }
      ]
    };

    expect(buildInsights(progress, now).length).toBeLessThanOrEqual(5);
  });
});
