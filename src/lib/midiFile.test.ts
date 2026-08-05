import { describe, it, expect } from "vitest";
import { createDefaultSongSketch } from "./songSketches";
import {
  midiNoteNumber,
  sketchToMidi,
  writeVarLen,
  downloadMidiBlob,
  TICKS_PER_QUARTER
} from "./midiFile";

/** Find the first index of a byte subsequence in a Uint8Array. */
function indexOfBytes(haystack: Uint8Array, needle: number[]): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        continue outer;
      }
    }
    return i;
  }
  return -1;
}

/** Count non-overlapping occurrences of a chunk type identifier. */
function countChunks(bytes: Uint8Array, type: string): number {
  const needle = Array.from(type, (char) => char.charCodeAt(0));
  let count = 0;
  for (let i = 0; i <= bytes.length - needle.length; i += 1) {
    if (needle.every((byte, j) => bytes[i + j] === byte)) {
      count += 1;
    }
  }
  return count;
}

describe("midiNoteNumber", () => {
  it("maps C4 to MIDI note 60", () => {
    expect(midiNoteNumber("C4")).toBe(60);
  });

  it("returns null for rest", () => {
    expect(midiNoteNumber("rest")).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(midiNoteNumber("not-a-note")).toBeNull();
  });
});

describe("writeVarLen", () => {
  it("encodes 0 as a single zero byte", () => {
    expect(writeVarLen(0)).toEqual([0x00]);
  });

  it("encodes 128 as two bytes", () => {
    expect(writeVarLen(128)).toEqual([0x81, 0x00]);
  });
});

describe("sketchToMidi", () => {
  it("starts with the MThd header chunk", () => {
    const bytes = sketchToMidi(createDefaultSongSketch());
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x4d, 0x54, 0x68, 0x64]);
  });

  it("contains at least one MTrk chunk", () => {
    const bytes = sketchToMidi(createDefaultSongSketch());
    expect(indexOfBytes(bytes, [0x4d, 0x54, 0x72, 0x6b])).toBeGreaterThan(-1);
  });

  it("includes a tempo meta event (FF 51 03)", () => {
    const bytes = sketchToMidi(createDefaultSongSketch());
    expect(indexOfBytes(bytes, [0xff, 0x51, 0x03])).toBeGreaterThan(-1);
  });
});

describe("sketchToMidi captured melody", () => {
  it("emits an extra track when a captured take is present", () => {
    const base = createDefaultSongSketch();
    const withTake = {
      ...base,
      capturedMelody: [{ note: "C4", startBeat: 0, durationBeats: 1 }]
    };

    expect(countChunks(sketchToMidi(withTake), "MTrk")).toBe(
      countChunks(sketchToMidi(base), "MTrk") + 1
    );
  });

  it("declares the emitted track count in the header", () => {
    const sketch = {
      ...createDefaultSongSketch(),
      capturedMelody: [{ note: "C4", startBeat: 0, durationBeats: 1 }]
    };
    const bytes = sketchToMidi(sketch);

    // MThd body: format (2 bytes), ntracks (2 bytes) at offset 10.
    const declared = (bytes[10] << 8) | bytes[11];
    expect(declared).toBe(countChunks(bytes, "MTrk"));
  });

  it("places a note-on at the take's beat offset", () => {
    const sketch = {
      ...createDefaultSongSketch(),
      capturedMelody: [{ note: "C4", startBeat: 2, durationBeats: 1 }]
    };
    const bytes = sketchToMidi(sketch);

    // Delta of 2 beats = 960 ticks -> VLQ [0x87, 0x40], then note-on ch 3, C4.
    const expected = [...writeVarLen(2 * TICKS_PER_QUARTER), 0x93, 60];
    expect(indexOfBytes(bytes, expected)).toBeGreaterThan(-1);
  });

  it("honours per-note velocity", () => {
    const sketch = {
      ...createDefaultSongSketch(),
      capturedMelody: [
        { note: "C4", startBeat: 0, durationBeats: 1, velocity: 100 }
      ]
    };
    expect(indexOfBytes(sketchToMidi(sketch), [0x93, 60, 100])).toBeGreaterThan(
      -1
    );
  });

  it("skips the take track when the melody is absent", () => {
    const base = createDefaultSongSketch();
    expect(countChunks(sketchToMidi(base), "MTrk")).toBe(
      countChunks(sketchToMidi({ ...base, capturedMelody: [] }), "MTrk")
    );
  });
});

describe("downloadMidiBlob", () => {
  it("produces an audio/midi Blob", () => {
    const blob = downloadMidiBlob(createDefaultSongSketch());
    expect(blob.type).toBe("audio/midi");
    expect(blob.size).toBeGreaterThan(0);
  });
});
