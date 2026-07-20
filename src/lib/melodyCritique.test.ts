/**
 * Tests for the Song Lab melody critique helper. Verifies deterministic,
 * non-throwing classification of melody notes against a chord progression,
 * calm reason strings, leap detection, and range computation across happy,
 * edge, and regression cases.
 */
import { describe, expect, it } from "vitest";

import {
  critiqueMelody,
  largeLeaps,
  melodyRange,
  type MelodyNote
} from "./melodyCritique";

function statusesOf(notes: MelodyNote[]): string[] {
  return notes.map((entry) => entry.status);
}

describe("critiqueMelody", () => {
  it("marks chord tones as chord-tone with non-empty reasons (happy path)", () => {
    const result = critiqueMelody({
      key: "C",
      mode: "major",
      chords: ["I", "I", "I"],
      melody: ["C4", "E4", "G5"]
    });

    expect(statusesOf(result.notes)).toEqual([
      "chord-tone",
      "chord-tone",
      "chord-tone"
    ]);
    for (const note of result.notes) {
      expect(note.reason.trim().length).toBeGreaterThan(0);
    }
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("classifies an in-key non-chord note as scale-tone", () => {
    const result = critiqueMelody({
      key: "C",
      mode: "major",
      chords: ["I"],
      melody: ["F4"]
    });

    expect(result.notes[0].status).toBe("scale-tone");
  });

  it("classifies an out-of-key chromatic note as tension", () => {
    const result = critiqueMelody({
      key: "C",
      mode: "major",
      chords: ["I"],
      melody: ["F#4"]
    });

    expect(result.notes[0].status).toBe("tension");
    expect(result.notes[0].reason).toContain("outside the key");
  });

  it("treats rests as rest and skips harmonic analysis", () => {
    const result = critiqueMelody({
      key: "C",
      mode: "major",
      chords: ["I", "I"],
      melody: ["rest", ""]
    });

    expect(statusesOf(result.notes)).toEqual(["rest", "rest"]);
    expect(result.summary).toContain("all rests");
  });

  it("clamps a melody longer than the chords array without throwing", () => {
    const run = () =>
      critiqueMelody({
        key: "C",
        mode: "major",
        chords: ["I"],
        melody: ["C4", "E4", "G4", "C5"]
      });

    expect(run).not.toThrow();
    const result = run();
    expect(result.notes).toHaveLength(4);
    expect(statusesOf(result.notes)).toEqual([
      "chord-tone",
      "chord-tone",
      "chord-tone",
      "chord-tone"
    ]);
  });

  it("does not throw on empty melody or empty chords", () => {
    expect(() =>
      critiqueMelody({ chords: [], melody: [] })
    ).not.toThrow();

    const noChords = critiqueMelody({ chords: [], melody: ["C4", "F#4"] });
    expect(noChords.notes).toHaveLength(2);
    expect(noChords.notes[0].status).toBe("tension");
  });
});

describe("largeLeaps", () => {
  it("detects an octave jump and ignores a step", () => {
    const leaps = largeLeaps(["C4", "D4", "C5"]);

    expect(leaps).toEqual([{ fromIndex: 1, toIndex: 2, semitones: 10 }]);
  });

  it("skips rests and measures across the gap", () => {
    const leaps = largeLeaps(["C4", "rest", "C5"]);

    expect(leaps).toEqual([{ fromIndex: 0, toIndex: 2, semitones: 12 }]);
  });
});

describe("melodyRange", () => {
  it("computes lowest, highest, and span for a pitched melody", () => {
    const range = melodyRange(["C4", "E4", "C5"]);

    expect(range.lowest).toBe("C4");
    expect(range.highest).toBe("C5");
    expect(range.spanSemitones).toBe(12);
  });

  it("returns nulls and zero span for an all-rest melody", () => {
    const range = melodyRange(["rest", "", "tie"]);

    expect(range).toEqual({ lowest: null, highest: null, spanSemitones: 0 });
  });
});
