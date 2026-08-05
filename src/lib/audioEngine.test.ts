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

  it("schedules a recorded jam take alongside the grid tracks", () => {
    const sketch = {
      ...createDefaultSongSketch("Take loop"),
      capturedMelody: [
        { note: "C4", startBeat: 0.5, durationBeats: 0.25, velocity: 0.9 },
        { note: "E4", startBeat: 1.75, durationBeats: 0.5 }
      ]
    };
    const take = songSketchPattern(sketch).events.filter(
      (event) => event.track === "take"
    );

    expect(take).toHaveLength(2);
    expect(take[0].note).toBe("C4");
    expect(take[0].startBeat).toBe(0.5);
    expect(take[1].startBeat).toBe(1.75);
  });

  it("preserves fractional take timing rather than snapping to bars", () => {
    const sketch = {
      ...createDefaultSongSketch(),
      capturedMelody: [{ note: "G4", startBeat: 2.25, durationBeats: 0.3 }]
    };
    const take = songSketchPattern(sketch).events.find(
      (event) => event.track === "take"
    );

    expect(take?.startBeat).toBe(2.25);
    expect(take?.durationBeats).toBe(0.3);
  });

  it("honours mute and solo for the take track", () => {
    const base = {
      ...createDefaultSongSketch(),
      capturedMelody: [{ note: "C4", startBeat: 0, durationBeats: 1 }]
    };
    const muted = songSketchPattern({ ...base, mutedTracks: ["take"] });
    const soloed = songSketchPattern({ ...base, soloTracks: ["take"] });

    expect(muted.events.some((event) => event.track === "take")).toBe(false);
    expect(soloed.events.every((event) => event.track === "take")).toBe(true);
  });
});
