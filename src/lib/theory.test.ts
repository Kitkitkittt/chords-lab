import { describe, expect, it } from "vitest";
import {
  chordInversion,
  chordSummary,
  chordsToRomanNumerals,
  enharmonicOf,
  formatInterval,
  intervalBetween,
  keyContext,
  nearestNoteFromFrequency,
  progressionChords,
  romanToChord,
  scaleDegreeOf,
  simplifyNote,
  solfegeForKey,
  solfegeOf,
  voiceLeadProgression,
  voicingMotion
} from "./theory";

describe("formatInterval", () => {
  it("converts tonal machine form to conventional names", () => {
    expect(formatInterval("3M")).toBe("M3");
    expect(formatInterval("5P")).toBe("P5");
    expect(formatInterval("-2m")).toBe("m-2");
  });

  it("produces verbose names with octave/unison exceptions", () => {
    expect(formatInterval("3M", { verbose: true })).toBe("major third");
    expect(formatInterval("5P", { verbose: true })).toBe("perfect fifth");
    expect(formatInterval("8P", { verbose: true })).toBe("octave");
    expect(formatInterval("1P", { verbose: true })).toBe("unison");
  });
});

describe("intervalBetween", () => {
  it("names intervals between notes", () => {
    expect(intervalBetween("C4", "E4")).toBe("M3");
    expect(intervalBetween("C4", "G4")).toBe("P5");
    expect(intervalBetween("A3", "C4")).toBe("m3");
    expect(intervalBetween("C4", "C5", { verbose: true })).toBe("octave");
  });
});

describe("enharmonics", () => {
  it("finds equivalents and simplifies spellings", () => {
    expect(enharmonicOf("C#4")).toBe("Db4");
    expect(enharmonicOf("Db4")).toBe("C#4");
    expect(simplifyNote("C##4")).toBe("D4");
  });
});

describe("nearestNoteFromFrequency", () => {
  it("returns the closest note and cents deviation", () => {
    expect(nearestNoteFromFrequency(440)).toEqual({ note: "A4", cents: 0 });

    const slightlySharp = nearestNoteFromFrequency(445);
    expect(slightlySharp?.note).toBe("A4");
    expect(slightlySharp?.cents).toBeGreaterThan(0);

    expect(nearestNoteFromFrequency(0)).toBeNull();
  });
});

describe("keyContext", () => {
  it("derives diatonic triads and roman numerals for major keys", () => {
    const c = keyContext("C", "major");
    expect(c.scale).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(c.keySignature).toBe("");
    expect(c.triads).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    expect(c.romanTriads["I"]).toBe("C");
    expect(c.romanTriads["ii"]).toBe("Dm");
    expect(c.romanTriads["V"]).toBe("G");
    expect(c.romanTriads["vii\u00B0"]).toBe("Bdim");
  });

  it("reports the correct key signature for sharp keys", () => {
    const g = keyContext("G", "major");
    expect(g.keySignature).toBe("#");
    expect(g.alteration).toBe(1);
    expect(g.triads).toEqual(["G", "Am", "Bm", "C", "D", "Em", "F#dim"]);
  });

  it("derives minor key chords", () => {
    const a = keyContext("A", "minor");
    expect(a.scale).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    expect(a.triads).toEqual(["Am", "Bdim", "C", "Dm", "Em", "F", "G"]);
  });
});

describe("romanToChord / progressionChords", () => {
  it("resolves roman numerals to concrete chords in any key", () => {
    expect(romanToChord("V7", "C")).toBe("G7");
    expect(romanToChord("vi", "C")).toBe("Am");
    expect(progressionChords(["I", "vi", "IV", "V"], "C")).toEqual([
      "C",
      "Am",
      "F",
      "G"
    ]);
    expect(progressionChords(["I", "V", "vi", "IV"], "G")).toEqual([
      "G",
      "D",
      "Em",
      "C"
    ]);
  });

  it("round-trips chords back to roman numerals", () => {
    expect(chordsToRomanNumerals(["C", "F", "G", "C"], "C")).toEqual([
      "I",
      "IV",
      "V",
      "I"
    ]);
  });
});

describe("chordInversion / chordSummary", () => {
  it("rotates chord tones into inversions", () => {
    expect(chordInversion("C", 0)).toEqual(["C", "E", "G"]);
    expect(chordInversion("C", 1)).toEqual(["E", "G", "C"]);
    expect(chordInversion("C", 2)).toEqual(["G", "C", "E"]);
  });

  it("labels chord quality and cardinality", () => {
    expect(chordSummary("C")).toMatchObject({
      quality: "major",
      cardinality: "triad"
    });
    expect(chordSummary("G7")).toMatchObject({
      quality: "dominant seventh",
      cardinality: "tetrad"
    });
  });
});

describe("solfege", () => {
  it("derives movable-do syllables for a key", () => {
    expect(solfegeForKey("C").map((step) => step.solfege)).toEqual([
      "do",
      "re",
      "mi",
      "fa",
      "sol",
      "la",
      "ti"
    ]);
    expect(solfegeOf("G", "C")).toBe("sol");
    expect(solfegeOf("F#", "C")).toBeNull();
  });
});

describe("scaleDegreeOf", () => {
  it("returns degree or 0 when out of scale", () => {
    expect(scaleDegreeOf("E", "C", "major")).toBe(3);
    expect(scaleDegreeOf("C", "C", "major")).toBe(1);
    expect(scaleDegreeOf("C#", "C", "major")).toBe(0);
  });
});

describe("voice leading", () => {
  it("voices a progression and reports smooth motion", () => {
    const steps = voiceLeadProgression(["Dm7", "G7", "C"]);
    expect(steps).toHaveLength(3);
    steps.forEach((step) => {
      expect(step.voicing.length).toBeGreaterThan(0);
    });

    const motion = voicingMotion(steps[0].voicing, steps[1].voicing);
    expect(motion).toBeGreaterThanOrEqual(0);
  });
});


