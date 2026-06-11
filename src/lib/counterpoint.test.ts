import { describe, expect, it } from "vitest";
import {
  checkFirstSpecies,
  isConsonant,
  verticalIntervalSemitones
} from "./counterpoint";

describe("verticalIntervalSemitones", () => {
  it("computes absolute semitone distance between two notes", () => {
    expect(verticalIntervalSemitones("C4", "G4")).toBe(7);
    expect(verticalIntervalSemitones("C4", "C5")).toBe(12);
  });

  it("is order independent", () => {
    expect(verticalIntervalSemitones("G4", "C4")).toBe(7);
  });

  it("returns null for invalid notes", () => {
    expect(verticalIntervalSemitones("H4", "C4")).toBeNull();
    expect(verticalIntervalSemitones("C4", "nope")).toBeNull();
  });
});

describe("isConsonant", () => {
  it("treats thirds, fifths, sixths, and octaves as consonant", () => {
    expect(isConsonant(7)).toBe(true); // P5
    expect(isConsonant(4)).toBe(true); // M3
    expect(isConsonant(12)).toBe(true); // octave
  });

  it("treats the perfect fourth and seconds as dissonant", () => {
    expect(isConsonant(5)).toBe(false); // P4
    expect(isConsonant(2)).toBe(false); // M2
  });
});

describe("checkFirstSpecies", () => {
  it("accepts a clean first-species example", () => {
    const cantusFirmus = ["C4", "D4", "E4", "D4", "C4"];
    const counterLine = ["G4", "B4", "G4", "F4", "C5"];
    // verticals: 7 (P5), 9 (M6), 3 (m3), 3 (m3), 12 (octave)
    const report = checkFirstSpecies(cantusFirmus, counterLine);

    expect(report.measures).toBe(5);
    expect(report.consonantCount).toBe(5);
    expect(report.isValid).toBe(true);
    expect(report.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });

  it("flags a dissonant measure as an error", () => {
    const cantusFirmus = ["C4", "D4", "E4", "D4", "C4"];
    const counterLine = ["G4", "E4", "G4", "F4", "C5"];
    // measure 2 vertical is a major second (2 semitones) -> dissonance
    const report = checkFirstSpecies(cantusFirmus, counterLine);

    const dissonance = report.issues.find((issue) => issue.rule === "dissonance");
    expect(dissonance).toBeDefined();
    expect(dissonance?.measure).toBe(2);
    expect(dissonance?.severity).toBe("error");
    expect(report.isValid).toBe(false);
  });

  it("reports a length mismatch and returns early", () => {
    const report = checkFirstSpecies(["C4", "D4"], ["G4", "B4", "C5"]);

    const lengthIssue = report.issues.find((issue) => issue.rule === "length");
    expect(lengthIssue).toBeDefined();
    expect(lengthIssue?.severity).toBe("error");
    expect(report.measures).toBe(3);
    expect(report.isValid).toBe(false);
  });

  it("detects parallel perfect fifths", () => {
    const cantusFirmus = ["C4", "D4", "E4"];
    const counterLine = ["G4", "A4", "C5"];
    // verticals: 7 (P5), 7 (P5), 8 (m6); both voices move into the second P5
    const report = checkFirstSpecies(cantusFirmus, counterLine);

    const parallel = report.issues.find(
      (issue) => issue.rule === "parallel-perfect"
    );
    expect(parallel).toBeDefined();
    expect(parallel?.measure).toBe(2);
    expect(parallel?.severity).toBe("error");
    expect(report.isValid).toBe(false);
  });
});
