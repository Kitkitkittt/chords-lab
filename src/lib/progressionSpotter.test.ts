/**
 * Tests for the progression spotter.
 */
import { describe, expect, it } from "vitest";
import {
  commonProgressions,
  findSongsWithProgression,
  normalizeNumerals,
  songsUsingProgressionName
} from "./progressionSpotter";
import type { RepertoireSong } from "../data/repertoire";

function song(id: string, numerals: string[]): RepertoireSong {
  return {
    id,
    title: id,
    origin: "test",
    era: "test",
    key: "C",
    mode: "major",
    meter: "4/4",
    bpm: 100,
    numerals,
    skills: [],
    note: "test"
  };
}

describe("normalizeNumerals", () => {
  it("trims whitespace while preserving case", () => {
    expect(normalizeNumerals([" I ", "vi ", " V"])).toEqual(["I", "vi", "V"]);
  });
});

describe("findSongsWithProgression", () => {
  it("finds songs containing the axis loop", () => {
    const matches = findSongsWithProgression(["I", "V", "vi", "IV"]);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("matches cyclically across the loop boundary", () => {
    const songs = [song("a", ["I", "IV", "V"])];
    const matches = findSongsWithProgression(["V", "I"], songs);
    expect(matches).toHaveLength(1);
    expect(matches[0].matchedAt).toBe(2);
  });

  it("returns matches ordered by song id", () => {
    const songs = [song("z", ["I", "V"]), song("a", ["I", "V"])];
    const matches = findSongsWithProgression(["I", "V"], songs);
    expect(matches.map((match) => match.song.id)).toEqual(["a", "z"]);
  });

  it("returns nothing for an empty query", () => {
    expect(findSongsWithProgression([])).toEqual([]);
  });
});

describe("commonProgressions", () => {
  it("includes the 12-bar blues", () => {
    const names = commonProgressions().map((entry) => entry.name);
    expect(names).toContain("12-bar blues");
  });
});

describe("songsUsingProgressionName", () => {
  it("returns an array for a known progression name", () => {
    expect(Array.isArray(songsUsingProgressionName("I–V–vi–IV"))).toBe(true);
  });

  it("returns an empty array for an unknown name", () => {
    expect(songsUsingProgressionName("nope")).toEqual([]);
  });
});
