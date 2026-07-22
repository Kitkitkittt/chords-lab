import { describe, expect, it } from "vitest";
import {
  bandLayerCount,
  computerKeyToNote,
  evaluatePianoChord,
  evaluatePianoSequence,
  pianoMaterialForKey,
  pianoNotes,
  progressionChordNotes,
  progressionSymbolsToNumerals
} from "./pianoPerformance";

describe("evaluatePianoChord", () => {
  it("evaluates exact root-position chords and de-dupes repeated notes", () => {
    expect(evaluatePianoChord(["C", "E", "G"], ["C4", "E4", "G4", "C5"])).toEqual({
      complete: true,
      missing: [],
      extra: [],
      bass: "C",
      inversion: "Root position"
    });
  });

  it("labels inversions, seventh inversions, outside basses, and empty input", () => {
    expect(evaluatePianoChord(["C", "E", "G"], ["E3", "G3", "C4"])).toMatchObject({
      complete: true,
      bass: "E",
      inversion: "First inversion"
    });
    expect(evaluatePianoChord(["C", "E", "G"], ["G3", "C4", "E4"])).toMatchObject({
      inversion: "Second inversion"
    });
    expect(evaluatePianoChord(["C", "E", "G", "B"], ["B3", "C4", "E4", "G4"])).toMatchObject({
      inversion: "Third inversion"
    });
    expect(evaluatePianoChord(["C", "E", "G"], ["B2", "C4", "E4", "G4"])).toMatchObject({
      complete: false,
      bass: "B",
      inversion: "Outside bass"
    });
    expect(evaluatePianoChord(["C", "E", "G"], [])).toMatchObject({
      bass: null,
      inversion: "Not started"
    });
  });

  it("reports missing and extra enharmonic pitch classes", () => {
    expect(evaluatePianoChord(["Db", "F", "Ab"], ["C#4", "F4", "A4", "A4"])).toEqual({
      complete: false,
      missing: ["Ab"],
      extra: ["A"],
      bass: "C#",
      inversion: "Root position"
    });
  });
});

describe("evaluatePianoSequence", () => {
  it("requires ordered exact-octave progress and reports first mistakes", () => {
    expect(evaluatePianoSequence(["C4", "D4", "E4"], ["C4", "D5"])).toEqual({
      complete: false,
      matched: 1,
      nextNote: "D",
      mistake: "D"
    });
    expect(evaluatePianoSequence(["C4", "D4", "E4"], ["C4", "Eb4", "E4"])).toEqual({
      complete: false,
      matched: 1,
      nextNote: "D",
      mistake: "Eb"
    });
  });

  it("requires each repeated event and completes exact sequences", () => {
    expect(evaluatePianoSequence(["C3", "C5", "E4"], ["C3", "C5", "E4"])).toEqual({
      complete: true,
      matched: 3,
      nextNote: null,
      mistake: null
    });
  });
});

describe("piano performance utilities", () => {
  it("generates absolute triads and sevenths for progressions", () => {
    expect(progressionChordNotes(["C", "G7"], 4)).toEqual([
      ["C4", "E4", "G4"],
      ["G4", "B4", "D5", "F5"]
    ]);
    expect(progressionChordNotes(["invalid"])).toEqual([[]]);
  });

  it("builds key-aware studio material and maps it to Song Lab numerals", () => {
    expect(pianoMaterialForKey("G").quests.slice(0, 4)).toEqual(["G", "Em", "C", "D7"]);
    const progression = pianoMaterialForKey("G").progressions[0];
    expect(progression).toEqual(["G", "D", "Em", "C"]);
    expect(progressionSymbolsToNumerals(progression, "G")).toEqual(["I", "V", "vi", "IV"]);
    expect(progressionSymbolsToNumerals(["Dm", "G7", "C"])).toEqual(["ii", "V7", "I"]);
  });

  it("clamps band layers", () => {
    expect([-2, 0, 1.8, 4, 9].map(bandLayerCount)).toEqual([0, 0, 1, 4, 4]);
  });

  it("maps computer keys to chromatic notes", () => {
    expect(computerKeyToNote("W", 4)).toBe("C#4");
    expect(computerKeyToNote("j", 7)).toBe("B7");
    expect(computerKeyToNote("q", 4)).toBeNull();
    expect(computerKeyToNote("a", 8)).toBeNull();
  });

  it("builds valid piano note ranges", () => {
    expect(pianoNotes(3, 2)).toHaveLength(24);
    expect(pianoNotes(3, 1)).toEqual([
      "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3"
    ]);
    expect(pianoNotes(0, 2)).toEqual([]);
    expect(pianoNotes(7, 2)).toEqual([]);
    expect(pianoNotes(3, 0)).toEqual([]);
  });
});
