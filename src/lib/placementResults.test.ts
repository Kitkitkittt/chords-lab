import { describe, expect, it } from "vitest";
import { generatePlacementPrompts } from "./placement";
import { defaultProgressState } from "./progressStorage";
import { clearPlacementProgress, placementResult } from "./placementResults";

describe("placementResult", () => {
  it("waits for all eight attempts then returns start and warm skills", () => {
    const prompts = generatePlacementPrompts();
    const attempts = Object.fromEntries(prompts.map((prompt) => [prompt.id, { correct: 1, attempted: 1 }]));

    expect(placementResult(prompts, {})).toBeUndefined();
    attempts[prompts[3].id] = { correct: 0, attempted: 1 };

    expect(placementResult(prompts, attempts)).toMatchObject({
      startHere: "interval-quality"
    });
  });

  it("clears placement artifacts without touching regular practice", () => {
    const placementId = generatePlacementPrompts()[0].id;
    const regularAttempt = {
      promptId: "pitch-note-1",
      moduleId: "pitch",
      isCorrect: false,
      expected: ["C"],
      selected: ["D"],
      question: "Name the note.",
      skillTargets: ["note-reading"],
      attemptedAt: "2026-05-31T00:00:00.000Z"
    };
    const result = clearPlacementProgress({
      ...defaultProgressState,
      placementResults: { [placementId]: { correct: 1, attempted: 1 } },
      practiceResults: {
        [placementId]: { correct: 2, attempted: 3 },
        "pitch-note-1": { correct: 4, attempted: 5 }
      },
      practiceMastery: {
        pitch: {
          correct: 4,
          attempted: 5,
          streak: 2,
          reviewQueue: [placementId, "pitch-note-1"]
        }
      },
      reviewPromptState: {
        [placementId]: {
          consecutiveCorrect: 0,
          lastResult: "incorrect",
          lastAttemptedAt: "2026-05-31T00:00:00.000Z"
        }
      },
      reviewPrompts: {
        [placementId]: {
          id: placementId,
          moduleId: "pitch",
          kind: "single",
          question: "Placement note.",
          choices: ["C", "D"],
          answer: ["C"],
          explanation: "C."
        }
      },
      skillMastery: {
        "note-reading": {
          correct: 4,
          attempted: 5,
          ease: 2.3,
          intervalDays: 1,
          lapses: 0,
          reviewQueue: [placementId, "pitch-note-1"]
        }
      },
      practiceAttempts: [
        { ...regularAttempt, promptId: placementId },
        regularAttempt
      ]
    });

    expect(result.placementResults).toEqual({});
    expect(result.practiceResults).toEqual({
      "pitch-note-1": { correct: 4, attempted: 5 }
    });
    expect(result.practiceMastery.pitch).toMatchObject({
      correct: 4,
      attempted: 5,
      streak: 2,
      reviewQueue: ["pitch-note-1"]
    });
    expect(result.skillMastery["note-reading"]).toMatchObject({
      correct: 4,
      attempted: 5,
      reviewQueue: ["pitch-note-1"]
    });
    expect(result.reviewPromptState).toEqual({});
    expect(result.reviewPrompts).toEqual({});
    expect(result.practiceAttempts).toEqual([regularAttempt]);
  });
});
