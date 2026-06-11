/**
 * Tests for the public-domain repertoire library.
 */
import { describe, expect, it } from "vitest";
import { repertoireById, repertoireSongs, type RepertoireSong } from "./repertoire";

const allowedNumerals = ["I", "ii", "iii", "IV", "V", "vi", "viio", "V7", "I6"];

describe("repertoireSongs", () => {
  it("includes at least 12 songs", () => {
    expect(repertoireSongs.length).toBeGreaterThanOrEqual(12);
  });

  it("has unique ids", () => {
    const ids = repertoireSongs.map((song) => song.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every song complete metadata and a non-empty numerals loop", () => {
    for (const song of repertoireSongs) {
      expect(song.id).toBeTruthy();
      expect(song.title).toBeTruthy();
      expect(song.origin).toBeTruthy();
      expect(song.key).toBeTruthy();
      expect(["major", "minor"]).toContain(song.mode);
      expect(song.meter).toBeTruthy();
      expect(song.bpm).toBeGreaterThan(0);
      expect(song.numerals.length).toBeGreaterThan(0);
    }
  });

  it("uses only allowed Roman numerals", () => {
    for (const song of repertoireSongs) {
      for (const numeral of song.numerals) {
        expect(allowedNumerals).toContain(numeral);
      }
    }
  });
});

describe("repertoireById", () => {
  it("finds a known song", () => {
    const song = repertoireById("ode-to-joy") as RepertoireSong;
    expect(song).toBeDefined();
    expect(song.title).toContain("Ode to Joy");
  });

  it("returns undefined for an unknown id", () => {
    expect(repertoireById("nope")).toBeUndefined();
  });
});
