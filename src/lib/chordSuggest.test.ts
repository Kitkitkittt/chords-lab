/**
 * Tests for the Song Lab chord-suggestion helper. Verifies deterministic
 * suggestions, well-formed reasons, the single "spice" option, fallback
 * behavior, and progression descriptions.
 */
import { describe, expect, it } from "vitest";

import {
  explainProgression,
  suggestNextChords,
  type ChordSuggestion
} from "./chordSuggest";

describe("suggestNextChords", () => {
  it("resolves V home, returning 4 suggestions that include I", () => {
    const suggestions = suggestNextChords("V");

    expect(suggestions).toHaveLength(4);
    expect(suggestions.map((s) => s.numeral)).toContain("I");
  });

  it("gives every suggestion a non-empty numeral and reason with exactly one spice", () => {
    const suggestions = suggestNextChords("V");

    for (const suggestion of suggestions) {
      expect(suggestion.numeral.trim().length).toBeGreaterThan(0);
      expect(suggestion.reason.trim().length).toBeGreaterThan(0);
    }

    const spice = suggestions.filter(
      (s: ChordSuggestion) => s.kind === "spice"
    );
    expect(spice).toHaveLength(1);
  });

  it("returns 4 deterministic fallback suggestions for unknown input", () => {
    const first = suggestNextChords("???");
    const second = suggestNextChords("???");

    expect(first).toHaveLength(4);
    expect(first).toEqual(second);
    expect(first.filter((s) => s.kind === "spice")).toHaveLength(1);
  });
});

describe("explainProgression", () => {
  it("names the four-chord pop loop", () => {
    expect(explainProgression(["I", "V", "vi", "IV"])).toContain("pop");
  });

  it("falls back to a non-empty generic description", () => {
    const description = explainProgression(["I", "IV"]);

    expect(description.length).toBeGreaterThan(0);
  });
});
