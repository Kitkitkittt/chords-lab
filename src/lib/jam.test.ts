import { describe, expect, it } from "vitest";
import {
  VIBES,
  vibeBackingPattern,
  vibeBarCount,
  vibeById,
  vibeChords,
  vibeSoloNotes
} from "./jam";

describe("jam lib", () => {
  it("exposes a set of distinct vibes", () => {
    expect(VIBES.length).toBeGreaterThanOrEqual(3);
    const ids = new Set(VIBES.map((vibe) => vibe.id));
    expect(ids.size).toBe(VIBES.length);
  });

  it("resolves a vibe by id", () => {
    expect(vibeById("sunset-pop")?.label).toBe("Sunset pop");
    expect(vibeById("nope")).toBeUndefined();
  });

  it("derives concrete chords from each vibe progression", () => {
    for (const vibe of VIBES) {
      const chords = vibeChords(vibe);
      expect(chords).toHaveLength(vibe.numerals.length);
      expect(chords.every((chord) => chord.length > 0)).toBe(true);
    }
  });

  it("derives a non-empty soloing scale that includes the tonic", () => {
    for (const vibe of VIBES) {
      const notes = vibeSoloNotes(vibe);
      expect(notes.length).toBeGreaterThan(0);
      expect(notes).toContain(vibe.tonic);
    }
  });

  it("builds a looping backing pattern with chord and bass events", () => {
    const vibe = VIBES[0];
    const pattern = vibeBackingPattern(vibe);
    expect(pattern.events.length).toBeGreaterThan(0);
    expect(pattern.bpm).toBe(vibe.bpm);

    const tracks = new Set(pattern.events.map((event) => event.track));
    expect(tracks.has("chords")).toBe(true);
    expect(tracks.has("bass")).toBe(true);

    // Bar count matches the progression length.
    expect(vibeBarCount(vibe)).toBe(vibe.numerals.length);
  });

  it("voices chords with octave information for playback", () => {
    const pattern = vibeBackingPattern(VIBES[0]);
    const chordEvent = pattern.events.find((event) => event.track === "chords");
    expect(Array.isArray(chordEvent?.note)).toBe(true);
    const notes = chordEvent?.note as string[];
    expect(notes.every((note) => /\d/.test(note))).toBe(true);
  });
});
