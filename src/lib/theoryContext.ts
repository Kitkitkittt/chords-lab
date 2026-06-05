/**
 * Song Lab theory-sync context.
 *
 * Derives the active key, chord, chord tones, scale notes, and safe melody
 * notes for the chord block a learner is editing. Chord resolution is powered
 * by the theory engine (`./theory`) so it now works for any key and for both
 * major and minor tonics, instead of the previous C/G/F-only lookup tables.
 *
 * It also understands a small set of figured-bass inversion tokens (e.g. `I6`
 * = tonic first inversion as a slash chord) used by Song Lab.
 */
import { Chord, Note } from "tonal";
import {
  chordInversion,
  keyContext,
  romanToChord,
  type KeyMode
} from "./theory";
import type { SongSketch, TheoryContext } from "../types/course";

/** Figured-bass suffix -> inversion index (0 = root position). */
const FIGURED_BASS_INVERSION: Record<string, number> = {
  "6": 1,
  "63": 1,
  "64": 2,
  "65": 1,
  "43": 2,
  "42": 3,
  "2": 3
};

const SEVENTH_FIGURES = new Set(["65", "43", "42", "2"]);

function pitchClasses(notes: string[]): string[] {
  return Array.from(
    new Set(notes.map((note) => Note.pitchClass(note)).filter(Boolean))
  );
}

/**
 * Resolve a chord token within a key. Handles three cases:
 *  - figured-bass inversion numerals (I6, V65, ...) -> slash chord,
 *  - plain Roman numerals (I, ii, V7, ...) via the engine,
 *  - literal chord symbols (C, Am, G7) passed straight through.
 */
function resolveChordSymbol(
  token: string,
  tonic: string,
  mode: KeyMode
): string {
  const figuredMatch = token.match(/^([b#]?[ivxIVX]+)(6|63|64|65|43|42|2)$/);

  if (figuredMatch) {
    const [, baseNumeral, figure] = figuredMatch;
    const wantsSeventh = SEVENTH_FIGURES.has(figure);
    const numeral = wantsSeventh ? `${baseNumeral}7` : baseNumeral;
    const baseChord = romanToChord(numeral, tonic, mode);
    const inversion = FIGURED_BASS_INVERSION[figure] ?? 0;
    const voiced = chordInversion(baseChord, inversion);
    const bass = Note.pitchClass(voiced[0]) || voiced[0];

    return bass ? `${baseChord}/${bass}` : baseChord;
  }

  const fromNumeral = romanToChord(token, tonic, mode);

  if (fromNumeral !== token) {
    return fromNumeral;
  }

  // Otherwise treat the token as a literal chord symbol.
  return token;
}

export function theoryContextForChord({
  key = "C",
  mode = "major",
  chord
}: {
  key?: string;
  mode?: KeyMode;
  chord: string;
}): TheoryContext {
  const context = keyContext(key, mode);
  const chordSymbol = resolveChordSymbol(chord, key, mode);
  const chordTones = pitchClasses(Chord.get(chordSymbol).notes);
  const scaleNotes = context.scale;
  const safeMelodyNotes = Array.from(new Set([...chordTones, ...scaleNotes]));

  return {
    key,
    chord: chordSymbol,
    scaleNotes,
    chordTones,
    safeMelodyNotes
  };
}

export function theoryContextForSongSketch(
  sketch: SongSketch,
  barIndex: number
): TheoryContext {
  const safeIndex = Math.max(
    0,
    Math.min(barIndex >= 0 ? barIndex : 0, sketch.tracks.chords.length - 1)
  );

  return theoryContextForChord({
    key: sketch.key ?? "C",
    mode: sketch.mode === "minor" ? "minor" : "major",
    chord: sketch.tracks.chords[safeIndex] ?? "I"
  });
}
