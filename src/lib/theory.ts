/**
 * Chords Lab music-theory engine.
 *
 * This module is the canonical, pure (no React, no Tone.js) layer that derives
 * music-theory facts from `tonal`. It deliberately leans on tonal's advanced
 * modules (Key, RomanNumeral, Progression, Mode, Voicing, VoiceLeading,
 * Chord.degrees) so that results are correct for every key instead of being
 * hardcoded for a handful of keys.
 *
 * Pedagogical conventions are borrowed from teoria:
 *  - Conventional interval names (M3, P5) instead of tonal's machine form (3M, 5P).
 *  - Movable-do solfege derived from scale degree in a key context.
 *  - Scale-degree detection that doubles as an "is note in scale" check.
 *  - Frequency <-> note conversion with cents deviation.
 */
import {
  Chord,
  Interval,
  Key,
  Midi,
  Mode,
  Note,
  Progression,
  RomanNumeral,
  Scale,
  VoiceLeading,
  Voicing,
  VoicingDictionary
} from "tonal";

export const THEORY_ENGINE_VERSION = "v2";

export type KeyMode = "major" | "minor";
export type MinorScaleForm = "natural" | "harmonic" | "melodic";

const VERBOSE_QUALITY: Record<string, string> = {
  dd: "doubly diminished",
  d: "diminished",
  m: "minor",
  P: "perfect",
  M: "major",
  A: "augmented",
  AA: "doubly augmented"
};

const ORDINAL: Record<number, string> = {
  1: "unison",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  6: "sixth",
  7: "seventh",
  8: "octave",
  9: "ninth",
  10: "tenth",
  11: "eleventh",
  12: "twelfth",
  13: "thirteenth"
};

/**
 * Convert tonal's machine interval form (e.g. `3M`, `5P`, `-2m`) into the
 * conventional pedagogical form used by teoria and most theory texts
 * (e.g. `M3`, `P5`, `m-2`). When `verbose` is set, returns a spoken name such
 * as "major third".
 */
export function formatInterval(
  tonalInterval: string,
  options: { verbose?: boolean } = {}
): string {
  const data = Interval.get(tonalInterval);

  if (data.empty || typeof data.num !== "number" || !data.q) {
    return tonalInterval;
  }

  const direction = data.dir === -1 ? "-" : "";

  if (options.verbose) {
    const quality = VERBOSE_QUALITY[data.q] ?? data.q;
    const ordinal = ORDINAL[Math.abs(data.num)] ?? `${Math.abs(data.num)}th`;
    const descending = data.dir === -1 ? " descending" : "";

    // A perfect unison/octave is conventionally spoken without "perfect".
    if (data.q === "P" && (ordinal === "unison" || ordinal === "octave")) {
      return `${ordinal}${descending}`.trim();
    }

    return `${quality} ${ordinal}${descending}`.trim();
  }

  return `${data.q}${direction}${Math.abs(data.num)}`;
}

/**
 * Conventional interval name between two notes (teoria-style `M3`, `P5`).
 */
export function intervalBetween(
  from: string,
  to: string,
  options: { verbose?: boolean } = {}
): string {
  const distance = Interval.distance(from, to);
  return formatInterval(distance, options);
}

/** Number of semitones in an interval, accepting either name form. */
export function intervalSemitones(intervalName: string): number {
  const normalized = /^[mMPAd]/.test(intervalName)
    ? `${intervalName.replace(/^([mMPAd]+)(-?)(\d+)$/, "$3$1")}`
    : intervalName;
  return Interval.semitones(normalized) ?? Interval.semitones(intervalName) ?? 0;
}

/** Pitch class without octave, falling back to a manual strip. */
export function pitchClass(note: string): string {
  return Note.pitchClass(note) || note.replace(/[0-9]/g, "");
}

/** Frequency in Hz for a note, rounded to two decimals (null if invalid). */
export function noteFrequency(noteName: string): number | null {
  const frequency = Note.freq(noteName);
  return typeof frequency === "number"
    ? Math.round(frequency * 100) / 100
    : null;
}

const KEYBOARD_PITCH_CLASSES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
] as const;

export function keyboardPitchClasses(): string[] {
  return [...KEYBOARD_PITCH_CLASSES];
}

/**
 * Map any spelling (Db, Cb, B#, F##) to the sharp-preferred pitch class used by
 * the on-screen keyboard. Derived from tonal's chroma instead of a hand-built
 * lookup table.
 */
export function keyboardPitchClass(noteName: string): string {
  const chroma = Note.chroma(pitchClass(noteName));

  if (typeof chroma === "number") {
    return KEYBOARD_PITCH_CLASSES[chroma];
  }

  return pitchClass(noteName);
}

/** Same as above, but preserves a trailing octave digit. */
export function keyboardNoteForPlayback(noteName: string): string {
  const octave = noteName.match(/-?\d+$/)?.[0] ?? "";
  return `${keyboardPitchClass(noteName)}${octave}`;
}

/** The enharmonic equivalent spelling for a note (C#4 -> Db4). */
export function enharmonicOf(noteName: string): string {
  return Note.enharmonic(noteName) || noteName;
}

/** Simplify a double-accidental or awkward spelling (C##4 -> D4). */
export function simplifyNote(noteName: string): string {
  return Note.simplify(noteName) || noteName;
}

export type FrequencyMatch = {
  note: string;
  cents: number;
};

/**
 * Find the closest note to a frequency and how many cents it deviates.
 * Mirrors teoria's `note.fromFrequency` so the app can later support a tuner
 * or pitch-matching ear check.
 */
export function nearestNoteFromFrequency(
  frequency: number
): FrequencyMatch | null {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return null;
  }

  const exactMidi = Midi.freqToMidi(frequency);
  const nearestMidi = Math.round(exactMidi);
  const note = Note.fromMidi(nearestMidi);
  const cents = Math.round((exactMidi - nearestMidi) * 100);

  return { note, cents };
}

// --------------------------------------------------------------------------
// Scales
// --------------------------------------------------------------------------

/** Notes of any named scale, e.g. `scaleNotes("C", "major")`. */
export function scaleNotes(tonic: string, scaleType = "major"): string[] {
  return Scale.get(`${tonic} ${scaleType}`).notes;
}

export function majorScaleNotes(tonic: string): string[] {
  return scaleNotes(tonic, "major");
}

export function naturalMinorScaleNotes(tonic: string): string[] {
  return scaleNotes(tonic, "minor");
}

/**
 * Resolve a learner-facing topic label (e.g. "modes", "pentatonic") into a
 * concrete tonal scale name, then return its notes. Falls back to major.
 */
export function scaleNotesForTopic(tonic: string, topic: string): string[] {
  const normalized =
    topic === "minor"
      ? "natural minor"
      : topic === "modes"
        ? "dorian"
        : topic === "pentatonic"
          ? "major pentatonic"
          : topic;

  const requested = Scale.get(`${tonic} ${normalized}`).notes;

  if (requested.length > 0) {
    return requested;
  }

  return majorScaleNotes(tonic);
}

/**
 * Scale degree (1-based) of a note within a scale, or 0 when the note is not in
 * the scale. Doubles as an "is note in scale" check, matching teoria's
 * `Note#scaleDegree`.
 */
export function scaleDegreeOf(
  note: string,
  tonic: string,
  scaleType = "major"
): number {
  const target = Note.chroma(pitchClass(note));

  if (typeof target !== "number") {
    return 0;
  }

  const notes = scaleNotes(tonic, scaleType);
  const index = notes.findIndex(
    (scaleNote) => Note.chroma(pitchClass(scaleNote)) === target
  );

  return index === -1 ? 0 : index + 1;
}

/** Greek modes available from tonal, e.g. for modal practice. */
export function modeNames(): string[] {
  return Mode.names();
}

export function modeNotes(tonic: string, mode: string): string[] {
  return Mode.notes(mode, tonic);
}

// --------------------------------------------------------------------------
// Keys, diatonic chords, and Roman numerals
// --------------------------------------------------------------------------

export type KeyContext = {
  tonic: string;
  mode: KeyMode;
  /** Minor scale form used to derive chords (only meaningful when minor). */
  minorForm: MinorScaleForm;
  scale: string[];
  keySignature: string;
  alteration: number;
  /** Roman numeral grades aligned with `triads`/`sevenths`. */
  grades: string[];
  triads: string[];
  sevenths: string[];
  /** Numeral -> diatonic triad, e.g. { I: "C", ii: "Dm", ... }. */
  romanTriads: Record<string, string>;
  /** Numeral -> diatonic seventh chord. */
  romanSevenths: Record<string, string>;
};

/** Display-case the Roman numeral so a major-quality chord is upper-case. */
function romanCase(grade: string, chordSymbol: string): string {
  const chord = Chord.get(chordSymbol);
  const isLower =
    chord.quality === "Minor" ||
    chord.quality === "Diminished" ||
    chord.type.includes("minor") ||
    chord.type.includes("diminished");

  const suffix = chord.type.includes("diminished") ? "\u00B0" : "";
  const numeral = isLower ? grade.toLowerCase() : grade.toUpperCase();
  return `${numeral}${suffix}`;
}

function buildRomanMap(grades: string[], chords: string[]): Record<string, string> {
  const map: Record<string, string> = {};

  grades.forEach((grade, index) => {
    const chordSymbol = chords[index];

    if (!chordSymbol) {
      return;
    }

    map[romanCase(grade, chordSymbol)] = chordSymbol;
  });

  return map;
}

/**
 * Full diatonic context for any key. Works for all 24 keys plus the three
 * common minor forms, replacing the previous C/G/F-only hardcoded tables.
 */
export function keyContext(
  tonic: string,
  mode: KeyMode = "major",
  minorForm: MinorScaleForm = "natural"
): KeyContext {
  if (mode === "minor") {
    const key = Key.minorKey(tonic);
    const form = key[minorForm];
    const grades = [...form.grades];
    const triads = [...form.triads];
    const sevenths = [...form.chords];

    return {
      tonic,
      mode,
      minorForm,
      scale: [...form.scale],
      keySignature: key.keySignature,
      alteration: key.alteration,
      grades,
      triads,
      sevenths,
      romanTriads: buildRomanMap(grades, triads),
      romanSevenths: buildRomanMap(grades, sevenths)
    };
  }

  const key = Key.majorKey(tonic);
  const grades = [...key.grades];
  const triads = [...key.triads];
  const sevenths = [...key.chords];

  return {
    tonic,
    mode,
    minorForm: "natural",
    scale: [...key.scale],
    keySignature: key.keySignature,
    alteration: key.alteration,
    grades,
    triads,
    sevenths,
    romanTriads: buildRomanMap(grades, triads),
    romanSevenths: buildRomanMap(grades, sevenths)
  };
}

/**
 * Resolve a Roman numeral (e.g. `V7`, `ii`, `vii\u00B0`) to a concrete chord symbol
 * inside a key. Preserves the chord quality that `Progression.fromRomanNumerals`
 * alone drops, by combining the diatonic triad/seventh with any explicit
 * numeral chord-type suffix.
 */
export function romanToChord(
  numeral: string,
  tonic: string,
  mode: KeyMode = "major",
  minorForm: MinorScaleForm = "natural"
): string {
  const context = keyContext(tonic, mode, minorForm);

  if (context.romanTriads[numeral]) {
    return context.romanTriads[numeral];
  }

  if (context.romanSevenths[numeral]) {
    return context.romanSevenths[numeral];
  }

  const parsed = RomanNumeral.get(numeral);

  if (parsed.empty || typeof parsed.step !== "number") {
    return numeral;
  }

  const wantsSeventh = parsed.chordType === "7" || parsed.chordType === "maj7";
  const base = wantsSeventh
    ? context.sevenths[parsed.step]
    : context.triads[parsed.step];

  return base ?? numeral;
}

/** Concrete chord symbols for a Roman-numeral progression in a key. */
export function progressionChords(
  numerals: string[],
  tonic: string,
  mode: KeyMode = "major",
  minorForm: MinorScaleForm = "natural"
): string[] {
  return numerals.map((numeral) =>
    romanToChord(numeral, tonic, mode, minorForm)
  );
}

/** Roman-numeral labels for a list of chord symbols in a key. */
export function chordsToRomanNumerals(
  chords: string[],
  tonic: string
): string[] {
  return Progression.toRomanNumerals(tonic, chords);
}

// --------------------------------------------------------------------------
// Chords, inversions, and quality labels
// --------------------------------------------------------------------------

export function chordNotes(symbol: string): string[] {
  return Chord.get(symbol).notes;
}

export type ChordSummary = {
  symbol: string;
  name: string;
  notes: string[];
  /** "major" | "minor" | "augmented" | "diminished" | "dominant" | ... */
  quality: string;
  /** "triad" | "tetrad" | ... derived from note count. */
  cardinality: string;
  empty: boolean;
};

const CARDINALITY: Record<number, string> = {
  2: "dyad",
  3: "triad",
  4: "tetrad",
  5: "pentad",
  6: "hexad"
};

/** Quality/type summary for a chord symbol (teoria-style labels). */
export function chordSummary(symbol: string): ChordSummary {
  const chord = Chord.get(symbol);
  const quality =
    chord.type && chord.type.length > 0
      ? chord.type
      : (chord.quality || "unknown").toLowerCase();

  return {
    symbol,
    name: chord.name || symbol,
    notes: chord.notes,
    quality,
    cardinality: CARDINALITY[chord.notes.length] ?? "chord",
    empty: chord.empty
  };
}

/**
 * Notes of a chord arranged into a specific inversion (0 = root position).
 * Derived with `Chord.degrees`, so it generalizes to any chord instead of the
 * previous hardcoded inversion literals.
 */
export function chordInversion(symbol: string, inversion = 0): string[] {
  const notes = Chord.get(symbol).notes;

  if (notes.length === 0) {
    return notes;
  }

  const offset = ((inversion % notes.length) + notes.length) % notes.length;
  return [...notes.slice(offset), ...notes.slice(0, offset)];
}

// --------------------------------------------------------------------------
// Solfege (movable-do) and scale degrees
// --------------------------------------------------------------------------

const MAJOR_SOLFEGE = ["do", "re", "mi", "fa", "sol", "la", "ti"];
const MINOR_SOLFEGE = ["do", "re", "me", "fa", "sol", "le", "te"];

export type SolfegeStep = {
  note: string;
  degree: number;
  solfege: string;
};

/**
 * Movable-do solfege for the notes of a key. Unlike the previous static
 * 8-row table, this derives from the requested tonic and mode.
 */
export function solfegeForKey(
  tonic: string,
  mode: KeyMode = "major"
): SolfegeStep[] {
  const syllables = mode === "minor" ? MINOR_SOLFEGE : MAJOR_SOLFEGE;
  const scaleType = mode === "minor" ? "minor" : "major";
  const notes = scaleNotes(tonic, scaleType);

  return notes.map((note, index) => ({
    note,
    degree: index + 1,
    solfege: syllables[index] ?? "do"
  }));
}

/** Solfege syllable for a single note within a key (or null if out of key). */
export function solfegeOf(
  note: string,
  tonic: string,
  mode: KeyMode = "major"
): string | null {
  const degree = scaleDegreeOf(
    note,
    tonic,
    mode === "minor" ? "minor" : "major"
  );

  if (degree === 0) {
    return null;
  }

  const syllables = mode === "minor" ? MINOR_SOLFEGE : MAJOR_SOLFEGE;
  return syllables[degree - 1] ?? null;
}

// --------------------------------------------------------------------------
// Voicings and voice leading
// --------------------------------------------------------------------------

export type VoiceLeadingStep = {
  chord: string;
  voicing: string[];
};

/**
 * Generate a smooth voice-led sequence of voicings for a chord progression.
 * Uses tonal's voicing dictionary and top-note-diff voice-leading strategy so
 * the Voice-Leading lesson has a real engine behind it.
 */
export function voiceLeadProgression(
  chords: string[],
  range: [string, string] = ["F3", "A4"]
): VoiceLeadingStep[] {
  const voicings = Voicing.sequence(
    chords,
    range,
    VoicingDictionary.all,
    VoiceLeading.topNoteDiff
  );

  return chords.map((chord, index) => ({
    chord,
    voicing: voicings[index] ?? Chord.get(chord).notes
  }));
}

/**
 * Total absolute semitone motion across all voices between two voicings.
 * Lower totals indicate smoother voice leading.
 */
export function voicingMotion(from: string[], to: string[]): number {
  const length = Math.min(from.length, to.length);
  let total = 0;

  for (let index = 0; index < length; index += 1) {
    const fromMidi = Note.midi(from[index]);
    const toMidi = Note.midi(to[index]);

    if (typeof fromMidi === "number" && typeof toMidi === "number") {
      total += Math.abs(toMidi - fromMidi);
    }
  }

  return total;
}
