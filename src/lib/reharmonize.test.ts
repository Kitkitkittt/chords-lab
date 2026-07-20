/**
 * Tests for the Song Lab reharmonization helper. Verifies deterministic
 * candidates per technique, well-formed reasons, secondary-dominant coverage,
 * fallback behavior for unknown numerals, and per-bar progression mapping.
 */
import { describe, expect, it } from "vitest";

import {
  reharmonizeChord,
  reharmonizeProgression,
  type ReharmonizeOption
} from "./reharmonize";

describe("reharmonizeChord", () => {
  it("offers a tonic-family substitution (vi or iii) for I", () => {
    const options = reharmonizeChord("I");
    const numerals = options.map((option) => option.numeral);

    expect(numerals.some((numeral) => numeral === "vi" || numeral === "iii")).toBe(
      true
    );
    const tonicFamily = options.find(
      (option) =>
        option.numeral === "vi" &&
        option.technique === "diatonic-substitution"
    );
    expect(tonicFamily).toBeDefined();
  });

  it("gives every option a non-empty numeral and reason", () => {
    const options = reharmonizeChord("V7");

    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.numeral.trim().length).toBeGreaterThan(0);
      expect(option.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it("includes a secondary-dominant technique for an appropriate numeral", () => {
    const options = reharmonizeChord("ii");
    const secondary = options.filter(
      (option: ReharmonizeOption) =>
        option.technique === "secondary-dominant"
    );

    expect(secondary.length).toBeGreaterThanOrEqual(1);
    expect(secondary[0]?.numeral).toBe("V7/V");
  });

  it("is deterministic: two calls deep-equal", () => {
    const first = reharmonizeChord("IV");
    const second = reharmonizeChord("IV");

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
  });

  it("returns a non-empty deterministic fallback for unknown numerals", () => {
    const first = reharmonizeChord("???");
    const second = reharmonizeChord("???");

    expect(first.length).toBeGreaterThan(0);
    expect(first).toEqual(second);
    expect(first.map((option) => option.numeral)).toContain("vi");
  });

  it("does not share mutable references with the constant tables", () => {
    const first = reharmonizeChord("I");
    const second = reharmonizeChord("I");

    expect(first[0]).not.toBe(second[0]);
  });
});

describe("reharmonizeProgression", () => {
  it("maps each bar to its options with correct barIndex and original", () => {
    const result = reharmonizeProgression(["I", "IV", "V"]);

    expect(result).toHaveLength(3);
    expect(result[0]?.barIndex).toBe(0);
    expect(result[0]?.original).toBe("I");
    expect(result[1]?.barIndex).toBe(1);
    expect(result[1]?.original).toBe("IV");
    expect(result[2]?.barIndex).toBe(2);
    expect(result[2]?.original).toBe("V");

    for (const entry of result) {
      expect(entry.options.length).toBeGreaterThan(0);
    }
  });

  it("returns an empty array for an empty progression", () => {
    expect(reharmonizeProgression([])).toEqual([]);
  });
});
