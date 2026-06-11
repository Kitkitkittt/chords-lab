import { describe, it, expect } from "vitest";
import { createDefaultSongSketch } from "./songSketches";
import {
  midiNoteNumber,
  sketchToMidi,
  writeVarLen,
  downloadMidiBlob
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

describe("downloadMidiBlob", () => {
  it("produces an audio/midi Blob", () => {
    const blob = downloadMidiBlob(createDefaultSongSketch());
    expect(blob.type).toBe("audio/midi");
    expect(blob.size).toBeGreaterThan(0);
  });
});
