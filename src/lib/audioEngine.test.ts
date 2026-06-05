import { describe, expect, it } from "vitest";
import { createDefaultSongSketch } from "./songSketches";
import {
  chordPattern,
  getPlaybackDurationMs,
  rhythmPattern,
  sequencePattern,
  songSketchPattern
} from "./audioEngine";

describe("audioEngine pattern timing", () => {
  it("calculates playback duration from the final scheduled event", () => {
    const shortSequence = sequencePattern("two notes", ["C4", "G4"], 96);
    const chord = chordPattern("C major", ["C4", "E4", "G4"], 84);
    const rhythm = rhythmPattern("four beats", ["hit", "rest", "hit", "hit"], 92);

    expect(getPlaybackDurationMs(shortSequence)).toBeGreaterThan(1000);
    expect(getPlaybackDurationMs(chord)).toBeGreaterThan(
      getPlaybackDurationMs(shortSequence)
    );
    expect(getPlaybackDurationMs(rhythm)).toBeGreaterThan(1500);
  });

  it("turns Song Lab sketches into one managed playback pattern", () => {
    const sketch = createDefaultSongSketch("Test loop");
    const pattern = songSketchPattern(sketch);

    expect(pattern.mode).toBe("song");
    expect(pattern.label).toBe("Test loop");
    expect(pattern.events.some((event) => event.track === "drums")).toBe(true);
    expect(pattern.events.some((event) => event.track === "chords")).toBe(true);
    expect(getPlaybackDurationMs(pattern)).toBeGreaterThan(15000);
  });
});
