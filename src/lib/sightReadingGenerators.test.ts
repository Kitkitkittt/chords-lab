/**
 * Tests for the sight-reading prompt generators.
 *
 * Verifies shape (ordered, staff render spec, playable audio), answer/choice
 * consistency, skill targeting, determinism, count clamping, and round-trip
 * compatibility with the practice engine's scorer.
 */
import { describe, expect, it } from "vitest";
import {
  generateSightReadingPrompt,
  generateSightReadingPrompts
} from "./sightReadingGenerators";
import { scorePracticeAnswer } from "./practiceEngine";

function countNotationTokens(notation: string): number {
  return notation.split(",").filter((token) => token.trim().length > 0).length;
}

describe("generateSightReadingPrompts", () => {
  it("returns the requested count of well-formed staff prompts", () => {
    const prompts = generateSightReadingPrompts(5);

    expect(prompts).toHaveLength(5);

    for (const prompt of prompts) {
      expect(prompt.kind).toBe("ordered");
      expect(prompt.notation).toBeTruthy();
      expect(prompt.clef).toBe("treble");
      expect(prompt.renderSpec?.type).toBe("staff");

      if (prompt.renderSpec?.type === "staff") {
        expect(prompt.renderSpec.notation).toBe(prompt.notation);
        expect(prompt.renderSpec.clef).toBe("treble");
      }

      expect(prompt.audioNotes && prompt.audioNotes.length).toBeGreaterThan(0);
      expect(prompt.playbackPattern).toBeDefined();
      expect(prompt.playbackPattern?.events.length).toBeGreaterThan(0);
    }
  });

  it("keeps every answer entry within the offered choices", () => {
    const prompts = generateSightReadingPrompts(8, "intermediate");

    for (const prompt of prompts) {
      for (const entry of prompt.answer) {
        expect(prompt.choices).toContain(entry);
      }
    }
  });

  it("matches answer length to the number of notated notes", () => {
    const prompts = generateSightReadingPrompts(8, "intermediate");

    for (const prompt of prompts) {
      expect(prompt.answer).toHaveLength(countNotationTokens(prompt.notation ?? ""));
    }
  });

  it("targets the note-reading skill", () => {
    const prompts = generateSightReadingPrompts(3);

    for (const prompt of prompts) {
      expect(prompt.skillTargets).toContain("note-reading");
    }
  });

  it("is deterministic for identical arguments", () => {
    const first = generateSightReadingPrompts(6, "intermediate", "demo-seed");
    const second = generateSightReadingPrompts(6, "intermediate", "demo-seed");

    expect(first).toEqual(second);
  });

  it("clamps the count to at most 20", () => {
    expect(generateSightReadingPrompts(50)).toHaveLength(20);
  });

  it("clamps the count to at least 1", () => {
    expect(generateSightReadingPrompts(0)).toHaveLength(1);
  });
});

describe("generateSightReadingPrompt scoring compatibility", () => {
  it("scores the prompt's own answer as correct", () => {
    const prompt = generateSightReadingPrompt("scoring-seed", 0, "beginner");
    const feedback = scorePracticeAnswer(prompt, prompt.answer);

    expect(feedback.status).toBe("correct");
  });

  it("scores a wrong order as incorrect", () => {
    const prompt = generateSightReadingPrompt("scoring-seed", 1, "intermediate");
    const reversed = [...prompt.answer].reverse();

    // Guard against a palindromic melody so the reversed answer truly differs.
    if (reversed.join("") === prompt.answer.join("")) {
      const swapped = [...prompt.answer];
      [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
      expect(scorePracticeAnswer(prompt, swapped).status).toBe("incorrect");
      return;
    }

    expect(scorePracticeAnswer(prompt, reversed).status).toBe("incorrect");
  });
});
