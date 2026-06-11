/**
 * Tests for the pure ear-dictation prompt generators.
 *
 * Verifies prompt shape, determinism, count clamping, choices/answer
 * compatibility with the existing practice UI, and that submitting the correct
 * answer scores as "correct" via `scorePracticeAnswer` (proving the generated
 * prompts are answerable by the unmodified engine).
 */

import { describe, expect, it } from "vitest";
import { scorePracticeAnswer } from "./practiceEngine";
import {
  generateDictationPrompts,
  generateMelodicDictation,
  generateRhythmicDictation
} from "./dictationGenerators";

describe("generateDictationPrompts", () => {
  it("produces 5 melodic prompts with playable, ear-training shape", () => {
    const prompts = generateDictationPrompts("melodic", 5);

    expect(prompts).toHaveLength(5);

    for (const prompt of prompts) {
      expect(prompt.kind).toBe("ordered");
      expect(prompt.answer.length).toBeGreaterThan(0);
      expect(prompt.audioNotes?.length ?? 0).toBeGreaterThan(0);
      expect(prompt.playbackPattern).toBeDefined();
      expect(prompt.skillTargets).toContain("ear-training");
    }
  });

  it("produces 4 rhythmic grid prompts with hit/rest cells", () => {
    const prompts = generateDictationPrompts("rhythmic", 4);

    expect(prompts).toHaveLength(4);

    for (const prompt of prompts) {
      expect(prompt.kind).toBe("grid");
      expect(prompt.choices).toEqual(["hit", "rest"]);
      expect(prompt.skillTargets).toContain("rhythm-reading");

      for (const cell of prompt.answer) {
        expect(["hit", "rest"]).toContain(cell);
      }
    }
  });

  it("is deterministic for identical arguments", () => {
    expect(generateDictationPrompts("melodic", 5)).toEqual(
      generateDictationPrompts("melodic", 5)
    );
    expect(generateDictationPrompts("rhythmic", 4, "seed-a")).toEqual(
      generateDictationPrompts("rhythmic", 4, "seed-a")
    );
  });

  it("clamps the count to at most 20", () => {
    expect(generateDictationPrompts("melodic", 50).length).toBeLessThanOrEqual(20);
    expect(generateDictationPrompts("melodic", 50)).toHaveLength(20);
  });

  it("clamps non-positive counts up to 1", () => {
    expect(generateDictationPrompts("rhythmic", 0)).toHaveLength(1);
    expect(generateDictationPrompts("rhythmic", -3)).toHaveLength(1);
  });

  it("keeps every answer a subset of its choices", () => {
    const prompts = [
      ...generateDictationPrompts("melodic", 8),
      ...generateDictationPrompts("rhythmic", 8)
    ];

    for (const prompt of prompts) {
      for (const note of prompt.answer) {
        expect(prompt.choices).toContain(note);
      }
    }
  });
});

describe("UI compatibility via scorePracticeAnswer", () => {
  it("scores a correct melodic answer as correct", () => {
    const prompt = generateMelodicDictation("dictation:melodic", 0);
    const feedback = scorePracticeAnswer(prompt, prompt.answer);

    expect(feedback.status).toBe("correct");
  });

  it("scores a correct rhythmic answer as correct", () => {
    const prompt = generateRhythmicDictation("dictation:rhythmic", 0);
    const feedback = scorePracticeAnswer(prompt, prompt.answer);

    expect(feedback.status).toBe("correct");
  });

  it("scores a wrong ordered answer as incorrect", () => {
    const prompt = generateMelodicDictation("dictation:melodic", 0);
    const reversed = [...prompt.answer].reverse();
    const feedback = scorePracticeAnswer(prompt, reversed);

    // Only meaningful when reversal actually changes the order.
    if (reversed.join() !== prompt.answer.join()) {
      expect(feedback.status).toBe("incorrect");
    }
  });
});
