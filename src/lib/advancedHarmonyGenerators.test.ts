/**
 * Tests for the Phase 6 advanced harmony prompt generators. Verifies prompt
 * shape, determinism, count clamping, and end-to-end scoring against the
 * existing practice engine.
 */

import { describe, expect, it } from "vitest";
import { scorePracticeAnswer } from "./practiceEngine";
import type { AdvancedHarmonyTopic } from "./advancedHarmonyGenerators";
import { generateAdvancedHarmonyPrompts } from "./advancedHarmonyGenerators";

const topics: AdvancedHarmonyTopic[] = [
  "secondary-dominants",
  "borrowed-chords",
  "modulation"
];

describe("generateAdvancedHarmonyPrompts", () => {
  for (const topic of topics) {
    it(`produces well-formed single-choice prompts for ${topic}`, () => {
      const prompts = generateAdvancedHarmonyPrompts(topic, 5);

      expect(prompts).toHaveLength(5);

      for (const prompt of prompts) {
        expect(prompt.kind).toBe("single");
        expect(prompt.answer).toHaveLength(1);
        expect(prompt.choices).toContain(prompt.answer[0]);
        expect(prompt.choices.length).toBeGreaterThanOrEqual(3);
        expect(prompt.skillTargets).toContain("roman-numerals");
        expect(prompt.moduleId).toBe("harmony");
        expect(prompt.citationLabel).toBe("Open Music Theory");
      }
    });

    it(`is deterministic for ${topic}`, () => {
      const first = generateAdvancedHarmonyPrompts(topic, 7, "seed-x");
      const second = generateAdvancedHarmonyPrompts(topic, 7, "seed-x");

      expect(first).toEqual(second);
    });

    it(`clamps the count for ${topic}`, () => {
      expect(generateAdvancedHarmonyPrompts(topic, 50)).toHaveLength(20);
      expect(generateAdvancedHarmonyPrompts(topic, 0).length).toBeGreaterThanOrEqual(
        1
      );
    });

    it(`scores correct and incorrect answers for ${topic}`, () => {
      const [prompt] = generateAdvancedHarmonyPrompts(topic, 1);

      expect(scorePracticeAnswer(prompt, prompt.answer).status).toBe("correct");

      const wrong = prompt.choices.find(
        (choice) => choice !== prompt.answer[0]
      );

      expect(wrong).toBeDefined();
      expect(scorePracticeAnswer(prompt, [wrong as string]).status).toBe(
        "incorrect"
      );
    });
  }

  it("produces stable unique ids per topic", () => {
    const prompts = generateAdvancedHarmonyPrompts("secondary-dominants", 3);

    expect(prompts.map((prompt) => prompt.id)).toEqual([
      "adv-secondary-0",
      "adv-secondary-1",
      "adv-secondary-2"
    ]);
  });
});
