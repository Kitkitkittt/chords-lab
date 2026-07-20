import { describe, expect, it } from "vitest";
import {
  buildConfusionPairs,
  generateConfusionPairDrill,
  topConfusionPair
} from "./confusionPairs";
import type { PracticeAttempt } from "../types/course";

const attempt = (overrides: Partial<PracticeAttempt> = {}): PracticeAttempt => ({
  promptId: "prompt-1",
  moduleId: "pitch",
  isCorrect: false,
  expected: ["C"],
  selected: ["D"],
  question: "Name this note.",
  skillTargets: ["note-reading"],
  attemptedAt: "2026-06-01T10:00:00.000Z",
  ...overrides
});

describe("confusion pairs", () => {
  it("merges reverse directions and honors the minimum count", () => {
    const attempts = [
      attempt(),
      attempt({
        promptId: "prompt-2",
        expected: ["D"],
        selected: ["C"],
        attemptedAt: "2026-06-02T10:00:00.000Z"
      })
    ];

    expect(buildConfusionPairs(attempts)).toHaveLength(1);
    expect(buildConfusionPairs(attempts)[0]).toMatchObject({
      tokens: ["C", "D"],
      count: 2
    });
    expect(buildConfusionPairs(attempts, 3)).toEqual([]);
  });

  it("excludes non-single, equal, correct, and malformed attempts", () => {
    const attempts = [
      attempt(),
      attempt({ expected: ["C", "E"], selected: ["D"] }),
      attempt({ expected: ["C"], selected: ["C"] }),
      attempt({ isCorrect: true }),
      { ...attempt(), expected: "C" } as unknown as PracticeAttempt
    ];

    expect(buildConfusionPairs(attempts, 1)).toHaveLength(1);
  });

  it("sorts by count, then latest attempt, then stable id", () => {
    const attempts = [
      attempt({ expected: ["E"], selected: ["F"], attemptedAt: "2026-06-03T10:00:00.000Z" }),
      attempt({ expected: ["E"], selected: ["F"], attemptedAt: "2026-06-01T10:00:00.000Z" }),
      attempt({ expected: ["C"], selected: ["D"], attemptedAt: "2026-06-02T10:00:00.000Z" }),
      attempt({ expected: ["C"], selected: ["D"], attemptedAt: "2026-06-01T10:00:00.000Z" }),
      attempt({ expected: ["A"], selected: ["B"], attemptedAt: "2026-06-02T10:00:00.000Z" }),
      attempt({ expected: ["A"], selected: ["B"], attemptedAt: "2026-06-01T10:00:00.000Z" })
    ];

    const pairs = buildConfusionPairs(attempts);
    expect(pairs.map((pair) => pair.tokens)).toEqual([["E", "F"], ["A", "B"], ["C", "D"]]);
    expect(topConfusionPair(attempts)).toEqual(pairs[0]);
    expect(pairs.every((pair) => /^[A-Za-z0-9%_-]+$/.test(pair.id))).toBe(true);
  });

  it("generates deterministic drills with source context and clamped counts", () => {
    const pair = buildConfusionPairs([attempt(), attempt({ promptId: "prompt-2" })])[0];
    const prompts = generateConfusionPairDrill(pair, 20);

    expect(prompts).toHaveLength(12);
    expect(prompts).toEqual(generateConfusionPairDrill(pair, 20));
    expect(prompts[0]).toMatchObject({
      id: `${pair.id}-1`,
      moduleId: "pitch",
      question: "Name this note.",
      answer: ["C"],
      choices: ["C", "D"],
      skillTargets: ["note-reading"]
    });
    expect(generateConfusionPairDrill(pair, 0)).toHaveLength(1);
  });
});
