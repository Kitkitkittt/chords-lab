import { describe, expect, it } from "vitest";
import {
  createDefaultSongSketch,
  createSketchFromJam,
  normalizeSongSketch
} from "./songSketches";
import type { CapturedNote, SongSketch } from "../types/course";

describe("songSketches", () => {
  it("builds a persistable sketch from a Jam Room take", () => {
    const melody: CapturedNote[] = [
      { note: "C4", startBeat: 0, durationBeats: 1 },
      { note: "E4", startBeat: 1, durationBeats: 0.5 }
    ];
    const sketch = createSketchFromJam({
      title: "Sunset jam",
      key: "C",
      mode: "major",
      bpm: 96,
      numerals: ["I", "V", "vi", "IV"],
      bassRoots: ["C2", "G2", "A2", "F2"],
      capturedMelody: melody
    });

    expect(sketch.title).toBe("Sunset jam");
    expect(sketch.key).toBe("C");
    expect(sketch.mode).toBe("major");
    expect(sketch.bpm).toBe(96);
    expect(sketch.form).toHaveLength(4);
    expect(sketch.tracks.chords).toEqual(["I", "V", "vi", "IV"]);
    expect(sketch.tracks.bass).toEqual(["C2", "G2", "A2", "F2"]);
    expect(sketch.capturedMelody).toEqual(melody);
    expect(sketch.id).toMatch(/^song-/);
  });

  it("omits capturedMelody when the take is empty", () => {
    const sketch = createSketchFromJam({
      title: "Empty",
      key: "G",
      mode: "major",
      bpm: 100,
      numerals: ["I"],
      bassRoots: ["G2"],
      capturedMelody: []
    });

    expect(sketch.capturedMelody).toBeUndefined();
  });

  it("clamps an invalid tempo when building from a jam", () => {
    const sketch = createSketchFromJam({
      title: "Bad tempo",
      key: "C",
      mode: "minor",
      bpm: 0,
      numerals: ["i"],
      bassRoots: ["C2"]
    });

    expect(sketch.bpm).toBe(92);
    expect(sketch.mode).toBe("minor");
  });

  it("preserves a valid captured melody through normalize", () => {
    const base = createDefaultSongSketch("With melody");
    const withMelody: SongSketch = {
      ...base,
      capturedMelody: [
        { note: "D4", startBeat: 0, durationBeats: 0.5, velocity: 0.7 }
      ]
    };

    const normalized = normalizeSongSketch(withMelody);
    expect(normalized.capturedMelody).toHaveLength(1);
    expect(normalized.capturedMelody?.[0].note).toBe("D4");
  });

  it("drops a malformed captured melody on normalize", () => {
    const base = createDefaultSongSketch("Bad melody");
    const bad = {
      ...base,
      capturedMelody: [
        { note: 42, startBeat: "x", durationBeats: null },
        { nope: true }
      ]
    } as unknown as SongSketch;

    expect(normalizeSongSketch(bad).capturedMelody).toBeUndefined();
  });

  it("floors negative beats and tiny durations from a captured melody", () => {
    const base = createDefaultSongSketch("Clamp melody");
    const dirty: SongSketch = {
      ...base,
      capturedMelody: [{ note: "C4", startBeat: -3, durationBeats: 0 }]
    };

    const note = normalizeSongSketch(dirty).capturedMelody?.[0];
    expect(note?.startBeat).toBe(0);
    expect(note?.durationBeats).toBeGreaterThanOrEqual(0.05);
  });
});
