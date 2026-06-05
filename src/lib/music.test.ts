import { describe, expect, it } from "vitest";
import {
  intervalName,
  keyboardPitchClasses,
  majorScaleNotes,
  naturalMinorScaleNotes,
  normalizeNoteForPlayback,
  normalizePitchClassForKeyboard,
  noteFrequency,
  triadNotes
} from "./music";

describe("music helpers", () => {
  it("calculates stable beginner note helpers", () => {
    expect(noteFrequency("A4")).toBe(440);
    expect(majorScaleNotes("C")).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B"
    ]);
    expect(naturalMinorScaleNotes("A")).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G"
    ]);
    expect(intervalName("C4", "E4")).toBe("3M");
    expect(triadNotes("C")).toEqual(["C", "E", "G"]);
    expect(keyboardPitchClasses()).toHaveLength(12);
    expect(normalizePitchClassForKeyboard("Bb4")).toBe("A#");
    expect(normalizeNoteForPlayback("Cb4")).toBe("B4");
  });
});
