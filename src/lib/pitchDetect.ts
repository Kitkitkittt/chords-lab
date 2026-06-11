/**
 * Pure DSP + music-math core for the opt-in microphone tuner.
 *
 * This module is intentionally pure: it performs NO microphone access, NO
 * `getUserMedia`, and creates NO `AudioContext`. It only operates on Float32
 * audio buffers that are handed to it, which makes every function here
 * unit-testable by feeding synthetic waveforms. The actual mic wiring (audio
 * graph, analyser node, render loop) lives in a separate component layer.
 *
 * The note math mirrors `theory.ts`'s `nearestNoteFromFrequency`, but this
 * variant also returns the MIDI number expected by the tuner UI and uses the
 * canonical equal-temperament formula `12 * log2(f / 440) + 69` (A4 = 440 Hz,
 * MIDI 69).
 */
import { Note } from "tonal";

const A4_FREQUENCY = 440;
const A4_MIDI = 69;

/** Below this RMS the signal is treated as silence / unusable. */
const SILENCE_RMS_THRESHOLD = 0.01;

/** Plausible musical fundamental range used to bound the autocorrelation lag. */
const MIN_FREQUENCY = 50;
const MAX_FREQUENCY = 1500;

/**
 * Estimate the fundamental frequency (Hz) of a buffer using normalized
 * autocorrelation with parabolic interpolation for sub-sample accuracy.
 * Returns `null` when the signal is too quiet or no clear pitch is found.
 */
export function detectPitchAutocorrelation(
  buffer: Float32Array,
  sampleRate: number
): number | null {
  const size = buffer.length;

  if (size === 0 || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    return null;
  }

  // RMS gate: reject silence / near-silence before doing any real work.
  let sumSquares = 0;
  for (let i = 0; i < size; i += 1) {
    const sample = buffer[i];
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / size);

  if (!Number.isFinite(rms) || rms < SILENCE_RMS_THRESHOLD) {
    return null;
  }

  // Lag bounds derived from the plausible frequency range. A higher frequency
  // means a shorter period (smaller lag), so the bounds invert.
  const minLag = Math.max(1, Math.floor(sampleRate / MAX_FREQUENCY));
  const maxLag = Math.min(size - 1, Math.ceil(sampleRate / MIN_FREQUENCY));

  if (maxLag <= minLag) {
    return null;
  }

  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;

    for (let i = 0; i < size - lag; i += 1) {
      correlation += buffer[i] * buffer[i + lag];
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestCorrelation <= 0) {
    return null;
  }

  // Parabolic interpolation around the peak using its immediate neighbors,
  // refining the integer lag toward a sub-sample estimate.
  let refinedLag = bestLag;

  if (bestLag > minLag && bestLag < maxLag) {
    const before = autocorrelationAt(buffer, bestLag - 1, size);
    const at = bestCorrelation;
    const after = autocorrelationAt(buffer, bestLag + 1, size);

    const denominator = before - 2 * at + after;

    if (denominator !== 0) {
      const offset = (0.5 * (before - after)) / denominator;

      if (Number.isFinite(offset) && Math.abs(offset) < 1) {
        refinedLag = bestLag + offset;
      }
    }
  }

  if (refinedLag <= 0) {
    return null;
  }

  const frequency = sampleRate / refinedLag;

  return Number.isFinite(frequency) ? frequency : null;
}

/** Raw autocorrelation at a single lag (helper for parabolic interpolation). */
function autocorrelationAt(
  buffer: Float32Array,
  lag: number,
  size: number
): number {
  let correlation = 0;

  for (let i = 0; i < size - lag; i += 1) {
    correlation += buffer[i] * buffer[i + lag];
  }

  return correlation;
}

export type NoteMatch = {
  note: string;
  midi: number;
  cents: number;
};

/**
 * Nearest equal-tempered note for a frequency, with its MIDI number and signed
 * cents deviation (-50..+50) from that note. Returns `null` for non-positive,
 * NaN, or otherwise invalid input.
 */
export function frequencyToNote(frequency: number): NoteMatch | null {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return null;
  }

  const exactMidi = 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI;
  const midi = Math.round(exactMidi);
  const cents = Math.round((exactMidi - midi) * 100);
  const note = Note.fromMidi(midi);

  if (!note) {
    return null;
  }

  return { note, midi, cents };
}

/**
 * Signed cents deviation of `frequency` relative to `targetFrequency`:
 * `1200 * log2(frequency / targetFrequency)`. Positive means sharp.
 */
export function centsOff(frequency: number, targetFrequency: number): number {
  return 1200 * Math.log2(frequency / targetFrequency);
}
