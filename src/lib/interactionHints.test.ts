import { describe, expect, it } from "vitest";
import { buildInteractionHint } from "./interactionHints";
import type { PracticePrompt } from "./practiceEngine";

function prompt(overrides: Partial<PracticePrompt>): PracticePrompt {
  return {
    id: "test-prompt",
    moduleId: "staff",
    kind: "single",
    question: "Test prompt",
    choices: ["C4", "D4"],
    answer: ["C4"],
    explanation: "C4 is the target.",
    ...overrides
  };
}

describe("interaction hints", () => {
  it("routes staff misses to staff setup with the selected answer visible", () => {
    const hint = buildInteractionHint(
      prompt({ inputMode: "staff-click", skillTargets: ["staff-click"] }),
      ["D4"]
    );

    expect(hint.linkedPracticeRoute).toBe("/practice/staff/setup");
    expect(hint.selectedExplanation).toContain("D4");
    expect(hint.shortHint).toContain("clef");
  });

  it("uses prompt-specific hint overrides when provided", () => {
    const hint = buildInteractionHint(
      prompt({
        moduleId: "chords",
        interactionHint: {
          shortHint: "Check the bass note first.",
          selectedExplanation: "Your bass note was G.",
          retryTarget: "Open chord builder.",
          linkedPracticeRoute: "/practice/chords/setup"
        }
      }),
      ["G"]
    );

    expect(hint.shortHint).toBe("Check the bass note first.");
    expect(hint.retryTarget).toBe("Open chord builder.");
  });
});
