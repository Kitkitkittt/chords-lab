/**
 * Tests for the pure pitch-detection core. These feed synthetic Float32
 * waveforms directly into the DSP functions; no microphone, AudioContext, or
 * other browser audio APIs are involved.
 */
import { describe, expect, it } from "vitest";

import {
  centsOff,
  detectPitchAutocorrelation,
  frequencyToNote
} from "./pitchDetect";

/** Synthesize a mono sine wave Float32Array at a given frequency. */
function sineBuffer(
  frequency: number,
  sampleRate: number,
  length: number
): Float32Array {
  const buffer = new Float32Array(length);

  for (let i = 0; i < length; i += 1) {
    buffer[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }

  return buffer;
}

describe("detectPitchAutocorrelation", () => {
  const sampleRate = 44100;
  const length = 4096;

  it("detects a 440 Hz sine within +/- 3 Hz", () => {
    const buffer = sineBuffer(440, sampleRate, length);
    const detected = detectPitchAutocorrelation(buffer, sampleRate);

    expect(detected).not.toBeNull();
    expect(detected as number).toBeGreaterThan(440 - 3);
    expect(detected as number).toBeLessThan(440 + 3);
  });

  it("detects a 220 Hz sine within +/- 3 Hz", () => {
    const buffer = sineBuffer(220, sampleRate, length);
    const detected = detectPitchAutocorrelation(buffer, sampleRate);

    expect(detected).not.toBeNull();
    expect(detected as number).toBeGreaterThan(220 - 3);
    expect(detected as number).toBeLessThan(220 + 3);
  });

  it("returns null for a silent (all zeros) buffer", () => {
    const buffer = new Float32Array(length);

    expect(detectPitchAutocorrelation(buffer, sampleRate)).toBeNull();
  });

  it("returns null for an empty buffer", () => {
    expect(detectPitchAutocorrelation(new Float32Array(0), sampleRate)).toBeNull();
  });
});

describe("frequencyToNote", () => {
  it("maps 440 Hz to A4 / MIDI 69 / ~0 cents", () => {
    const match = frequencyToNote(440);

    expect(match).not.toBeNull();
    expect(match?.note).toBe("A4");
    expect(match?.midi).toBe(69);
    expect(Math.abs(match?.cents ?? Infinity)).toBeLessThanOrEqual(1);
  });

  it("returns null for zero", () => {
    expect(frequencyToNote(0)).toBeNull();
  });

  it("returns null for NaN", () => {
    expect(frequencyToNote(NaN)).toBeNull();
  });
});

describe("centsOff", () => {
  it("is ~0 cents for identical frequencies", () => {
    expect(Math.abs(centsOff(440, 440))).toBeLessThanOrEqual(0.01);
  });

  it("is ~100 cents for a semitone above (466.16 vs 440)", () => {
    expect(centsOff(466.16, 440)).toBeGreaterThan(100 - 3);
    expect(centsOff(466.16, 440)).toBeLessThan(100 + 3);
  });
});
