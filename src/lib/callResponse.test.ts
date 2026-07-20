import { describe, expect, it } from "vitest";
import {
  detectClapOnset,
  scoreClapBack,
  scoreSingBack
} from "./callResponse";

describe("scoreSingBack", () => {
  it("matches the target in the same octave", () => {
    expect(scoreSingBack("A4", 440)).toMatchObject({
      verdict: "match",
      targetNote: "A4",
      detectedNote: "A4",
      cents: 0
    });
  });

  it("matches an octave-equivalent pitch", () => {
    expect(scoreSingBack("C4", 130.8128)).toMatchObject({
      verdict: "match",
      targetNote: "C4",
      detectedNote: "C3"
    });
  });

  it("classifies wrapped pitch-class deviations", () => {
    expect(scoreSingBack("C4", 493.8833)).toMatchObject({
      verdict: "low"
    });
    expect(scoreSingBack("B4", 261.6256)).toMatchObject({
      verdict: "high"
    });
  });

  it("rejects invalid targets and frequencies", () => {
    expect(scoreSingBack("not a note", 440)).toBeNull();
    expect(scoreSingBack("A4", 0)).toBeNull();
    expect(scoreSingBack("A4", Number.NaN)).toBeNull();
  });
});

describe("detectClapOnset", () => {
  it("detects a clear threshold crossing", () => {
    expect(detectClapOnset(new Float32Array([0.5, -0.5]), 0.05)).toEqual({
      rms: 0.5,
      onset: true
    });
  });

  it("does not retrigger a sustained loud frame", () => {
    expect(detectClapOnset(new Float32Array([0.5, -0.5]), 0.5)).toEqual({
      rms: 0.5,
      onset: false
    });
  });

  it("safely rejects silence, empty buffers, and non-finite data", () => {
    expect(detectClapOnset(new Float32Array([0, 0]), 0)).toEqual({
      rms: 0,
      onset: false
    });
    expect(detectClapOnset(new Float32Array(), 0)).toEqual({
      rms: 0,
      onset: false
    });
    expect(detectClapOnset(new Float32Array([Number.NaN]), 0)).toEqual({
      rms: 0,
      onset: false
    });
  });
});

describe("scoreClapBack", () => {
  const pattern = ["hit", "rest", "hit", "rest"] as const;

  it("normalizes permission and start latency", () => {
    expect(scoreClapBack(pattern, [1000, 1500], 120)).toMatchObject({
      verdict: "match",
      expectedCount: 2,
      detectedCount: 2,
      meanAbsoluteTimingErrorMs: 0
    });
  });

  it("matches exact timing and reports mean absolute timing error", () => {
    expect(scoreClapBack(pattern, [400, 910], 120)).toMatchObject({
      verdict: "match",
      meanAbsoluteTimingErrorMs: 5
    });
  });

  it("marks exact-count timing within 180ms as close", () => {
    expect(scoreClapBack(pattern, [400, 1025], 120)).toMatchObject({
      verdict: "close",
      meanAbsoluteTimingErrorMs: 62.5
    });
  });

  it("marks one missing or extra onset with reasonable timing as close", () => {
    expect(scoreClapBack(pattern, [400], 120)).toMatchObject({
      verdict: "close",
      expectedCount: 2,
      detectedCount: 1
    });
    expect(scoreClapBack(pattern, [400, 900, 1400], 120)).toMatchObject({
      verdict: "close",
      expectedCount: 2,
      detectedCount: 3
    });
  });

  it("retries widely inaccurate attempts and invalid BPM", () => {
    expect(scoreClapBack(pattern, [400, 1300], 120)).toMatchObject({
      verdict: "retry"
    });
    expect(scoreClapBack(pattern, [400, 900], 0)).toMatchObject({
      verdict: "retry"
    });
  });
});
