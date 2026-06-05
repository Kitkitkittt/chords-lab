import { describe, expect, it } from "vitest";
import { createDefaultSongSketch } from "./songSketches";
import {
  bassTargetsFor,
  chordToneHighlights,
  explainSongSketch,
  fretboardPositions,
  noteAtFret,
  scaleDegreeHighlights,
  standardTunings
} from "./instruments";

describe("instrument helpers", () => {
  it("labels chord tones and scale degrees for keyboard highlights", () => {
    expect(chordToneHighlights("C").map((item) => item.degree)).toEqual([
      "1",
      "3",
      "5"
    ]);
    expect(scaleDegreeHighlights("C")[4]).toMatchObject({
      note: "G",
      degree: "5"
    });
  });

  it("maps fretted notes from standard tunings", () => {
    expect(noteAtFret("E2", 3)).toBe("G");
    expect(noteAtFret("A4", 3)).toBe("C");
    expect(
      fretboardPositions(standardTunings.guitar, ["C", "E", "G"], "C")[1][3]
    ).toMatchObject({ note: "C", isActive: true, isRoot: true });
  });

  it("builds bass targets and Song Lab explanations", () => {
    expect(bassTargetsFor("C")).toEqual(["C2", "G2", "C3", "G2"]);
    expect(explainSongSketch(createDefaultSongSketch("Loop"))).toContain(
      "includes a voice guide"
    );
  });
});
