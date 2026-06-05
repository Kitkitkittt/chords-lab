/**
 * Beginner-facing music helpers.
 *
 * This module now delegates to the canonical theory engine in `./theory`.
 * It keeps its original public surface (the names other modules import) so the
 * rest of the app does not need to change, while the underlying logic is
 * derived from tonal instead of hand-built lookup tables.
 */
import {
  chordNotes,
  enharmonicOf,
  intervalBetween,
  keyboardNoteForPlayback,
  keyboardPitchClass,
  keyboardPitchClasses as keyboardPitchClassesFromEngine,
  majorScaleNotes as majorScaleNotesFromEngine,
  naturalMinorScaleNotes as naturalMinorScaleNotesFromEngine,
  nearestNoteFromFrequency,
  noteFrequency as noteFrequencyFromEngine,
  simplifyNote
} from "./theory";

export function noteFrequency(noteName: string): number | null {
  return noteFrequencyFromEngine(noteName);
}

export function majorScaleNotes(tonic: string): string[] {
  return majorScaleNotesFromEngine(tonic);
}

export function naturalMinorScaleNotes(tonic: string): string[] {
  return naturalMinorScaleNotesFromEngine(tonic);
}

/**
 * Conventional interval name between two notes, e.g. `M3`, `P5`.
 * Pass `{ verbose: true }` for "major third".
 */
export function intervalName(
  from: string,
  to: string,
  options: { verbose?: boolean } = {}
): string {
  return intervalBetween(from, to, options);
}

export function triadNotes(symbol: string): string[] {
  return chordNotes(symbol);
}

export function keyboardPitchClasses(): string[] {
  return keyboardPitchClassesFromEngine();
}

export function normalizePitchClassForKeyboard(noteName: string): string {
  return keyboardPitchClass(noteName);
}

export function normalizeNoteForPlayback(noteName: string): string {
  return keyboardNoteForPlayback(noteName);
}

export { enharmonicOf, nearestNoteFromFrequency, simplifyNote };
